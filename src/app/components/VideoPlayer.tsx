"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";

/**
 * The bits of the YouTube IFrame API this file actually uses. Typing them
 * narrowly beats `any`: the compiler catches a misspelt player method, and
 * everything optional reflects that the API adds methods across versions.
 */
type YTPlayer = {
  destroy?: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted?: () => boolean;
  getPlayerState?: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  getDuration: () => number;
  getCurrentTime: () => number;
  getIframe?: () => HTMLIFrameElement | undefined;
  setPlaybackQuality: (level: string) => void;
  getAvailableQualityLevels?: () => string[];
};

type YTEvent<T = number> = { target: YTPlayer; data: T };

type YTNamespace = {
  Player: new (
    elementId: string,
    options: {
      width: string;
      height: string;
      videoId: string;
      playerVars: Record<string, number>;
      events: {
        onReady: (e: YTEvent) => void;
        onStateChange: (e: YTEvent) => void;
        onPlaybackQualityChange: (e: YTEvent<string>) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number };
};

declare global {
  interface Window {
    YT: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/**
 * Where a player gets its footage. YouTube carries most of the site; `file`
 * is for clips we host ourselves under `public/`, which play through a plain
 * <video> element but keep the same shield and custom control bar.
 */
export type VideoSource =
  | { kind: "youtube"; id: string }
  | { kind: "file"; src: string };

export const youtube = (id: string): VideoSource => ({ kind: "youtube", id });
export const selfHosted = (src: string): VideoSource => ({ kind: "file", src });

function loadYouTubeApi(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  });
}

function setHighestQuality(target: YTPlayer) {
  const levels: string[] = target.getAvailableQualityLevels?.() ?? [];
  target.setPlaybackQuality(levels[0] ?? "hd2160");
}

const qualityLabels: Record<string, string> = {
  highres: "4K+",
  hd2160: "2160p",
  hd1440: "1440p",
  hd1080: "1080p",
  hd720: "720p",
  large: "480p",
  medium: "360p",
  small: "240p",
  tiny: "144p",
  auto: "Auto",
  default: "Auto",
};

function qualityLabel(level: string) {
  return qualityLabels[level] ?? level;
}

function formatVideoTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Single engine behind every YouTube player on the site. Owns the YT.Player
 * instance and its custom-controls state; nothing plays until `start()` is
 * called from a user click, so no player autoplays on page load.
 */
export function useVideoPlayer() {
  const rawId = useId();
  const elementId = `yt-player-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [playing, setPlaying] = useState(false);
  // Starts true so the shield stays up over YouTube's own paused/cued chrome
  // until playback genuinely begins.
  const [paused, setPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  // Every player starts from a click, so sound is on by default; the browser
  // gets the last word and the fallbacks below correct this if it says no.
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState("auto");
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [source, setSource] = useState<VideoSource | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const fileRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userPickedQuality = useRef(false);
  const activeSourceKey = useRef<string | null>(null);

  const sourceKey = (s: VideoSource) => (s.kind === "youtube" ? s.id : s.src);

  /**
   * A YouTube player has to autoplay muted (`mute: 1`) to be sure it starts at
   * all, so sound is switched on the moment it's ready. The click that opened
   * the video usually still counts as the gesture that permits this, but the
   * API script load in between can outlast it — and a browser that disagrees
   * answers by pausing. Check back once, and rather than leave the viewer
   * staring at a stalled frame, take muted playback instead.
   */
  function enableSound(target: YTPlayer) {
    target.unMute();
    target.setVolume(100);
    setMuted(false);
    setVolume(100);
    setTimeout(() => {
      if (playerRef.current !== target) return;
      // Buffering isn't a refusal, so only an outright pause counts as one.
      const refused =
        (target.isMuted?.() ?? false) ||
        target.getPlayerState?.() === window.YT.PlayerState.PAUSED;
      if (!refused) return;
      target.mute();
      setMuted(true);
      target.playVideo();
    }, 700);
  }

  function start(next: VideoSource, nextTitle?: string) {
    const key = sourceKey(next);
    activeSourceKey.current = key;
    setSource(next);
    setTitle(nextTitle ?? null);
    setPlaying(true);
    setPaused(true);
    setFailed(false);
    setMuted(false);
    setVolume(100);
    userPickedQuality.current = false;

    if (next.kind === "file") {
      // A self-hosted clip has no quality ladder to offer, and the <video>
      // element it plays through only exists after the next commit — so the
      // effect below takes it from here.
      setAvailableQualities([]);
      setQuality("auto");
      return;
    }

    const videoId = next.id;
    const title = nextTitle;
    loadYouTubeApi().then(() => {
      // Ignore a stale load if the caller moved on to a different video
      // (e.g. rapidly clicking between destination cards).
      if (activeSourceKey.current !== videoId) return;
      playerRef.current?.destroy?.();
      playerRef.current = new window.YT.Player(elementId, {
        width: "1920",
        height: "1080",
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
        },
        events: {
          onReady: (e: YTEvent) => {
            const iframe = e.target.getIframe?.();
            if (iframe && title) iframe.title = title;
            setAvailableQualities(e.target.getAvailableQualityLevels?.() ?? []);
            setHighestQuality(e.target);
            e.target.playVideo();
            setDuration(e.target.getDuration());
            enableSound(e.target);
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
              if (playerRef.current) {
                setCurrentTime(playerRef.current.getCurrentTime());
                setDuration(playerRef.current.getDuration());
              }
            }, 250);
          },
          onStateChange: (e: YTEvent) => {
            setPaused(e.data !== window.YT.PlayerState.PLAYING);
            if (e.data === window.YT.PlayerState.PLAYING && !userPickedQuality.current) {
              setHighestQuality(e.target);
            }
          },
          onPlaybackQualityChange: (e: YTEvent<string>) => {
            setQuality(e.data);
          },
        },
      });
    });
  }

  /**
   * A self-hosted clip reports its own state through these, which VideoStage
   * spreads onto the <video> element. Every one of them also re-captures the
   * element itself, so the control bar always has something to drive without
   * the hook ever holding a ref that travels through props.
   */
  const fileEvents = {
    onLoadedMetadata: (e: SyntheticEvent<HTMLVideoElement>) => {
      const el = e.currentTarget;
      fileRef.current = el;
      setDuration(Number.isFinite(el.duration) ? el.duration : 0);
      setVolume(Math.round(el.volume * 100));
      setMuted(el.muted);
    },
    /**
     * The element carries no `muted` attribute, so `autoPlay` asks for sound —
     * which a browser may refuse even though the click that opened the video
     * ought to permit it. Ask again here, and drop to muted playback rather
     * than leave the clip sitting on its first frame.
     */
    onCanPlay: (e: SyntheticEvent<HTMLVideoElement>) => {
      const el = e.currentTarget;
      fileRef.current = el;
      if (!el.paused) return;
      el.play().catch(() => {
        el.muted = true;
        setMuted(true);
        el.play().catch(() => {});
      });
    },
    onDurationChange: (e: SyntheticEvent<HTMLVideoElement>) => {
      const el = e.currentTarget;
      setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    },
    onTimeUpdate: (e: SyntheticEvent<HTMLVideoElement>) => {
      fileRef.current = e.currentTarget;
      setCurrentTime(e.currentTarget.currentTime);
    },
    onPlay: (e: SyntheticEvent<HTMLVideoElement>) => {
      fileRef.current = e.currentTarget;
      setPaused(false);
    },
    onPause: () => setPaused(true),
    onError: () => setFailed(true),
  };

  function stop() {
    activeSourceKey.current = null;
    fileRef.current?.pause();
    fileRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    playerRef.current?.destroy?.();
    playerRef.current = null;
    setSource(null);
    setTitle(null);
    setFailed(false);
    setPlaying(false);
    setPaused(true);
    setCurrentTime(0);
    setDuration(0);
    setQuality("auto");
    setAvailableQualities([]);
    userPickedQuality.current = false;
  }

  function changeQuality(e: ChangeEvent<HTMLSelectElement>) {
    const level = e.target.value;
    userPickedQuality.current = level !== "default";
    playerRef.current?.setPlaybackQuality(level);
    setQuality(level === "default" ? "auto" : level);
  }

  const isFile = source?.kind === "file";

  function togglePlayPause() {
    if (isFile) {
      const el = fileRef.current;
      if (!el) return;
      if (el.paused) el.play().catch(() => {});
      else el.pause();
      return;
    }
    if (!playerRef.current) return;
    if (paused) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }

  function seek(e: ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setCurrentTime(value);
    if (isFile) {
      const el = fileRef.current;
      if (el) el.currentTime = value;
      return;
    }
    playerRef.current?.seekTo(value, true);
  }

  function toggleMute() {
    if (isFile) {
      const el = fileRef.current;
      if (!el) return;
      el.muted = !el.muted;
      setMuted(el.muted);
      return;
    }
    if (!playerRef.current) return;
    if (muted) {
      playerRef.current.unMute();
      setMuted(false);
    } else {
      playerRef.current.mute();
      setMuted(true);
    }
  }

  function handleVolume(e: ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setVolume(value);
    if (isFile) {
      const el = fileRef.current;
      if (el) {
        el.volume = value / 100;
        el.muted = value === 0;
        setMuted(value === 0);
      }
      return;
    }
    playerRef.current?.setVolume(value);
    if (value === 0) {
      setMuted(true);
      playerRef.current?.mute();
    } else {
      setMuted(false);
      playerRef.current?.unMute();
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current?.destroy?.();
    };
  }, []);

  return {
    elementId,
    source,
    title,
    failed,
    fileEvents,
    playing,
    paused,
    currentTime,
    duration,
    volume,
    muted,
    quality,
    availableQualities,
    start,
    stop,
    togglePlayPause,
    seek,
    toggleMute,
    handleVolume,
    changeQuality,
  };
}

export type VideoPlayer = ReturnType<typeof useVideoPlayer>;

/** Mount point YT.Player replaces with its iframe — or, for a self-hosted
 * source, the <video> element itself — plus the cover shield that masks the
 * player's own paused/cued frame until playback truly starts. */
export function VideoStage({ player }: { player: VideoPlayer }) {
  return (
    <>
      {player.source?.kind === "file" ? (
        <video
          {...player.fileEvents}
          className="video-file"
          src={player.source.src}
          title={player.title ?? undefined}
          preload="metadata"
          autoPlay
          playsInline
        />
      ) : (
        <div id={player.elementId} />
      )}
      <div
        className={`video-shield${player.paused && !player.failed ? "" : " is-hidden"}`}
        aria-hidden="true"
      >
        <span className="video-spinner" />
      </div>
      {player.failed && (
        <p className="video-error" role="status">
          This video couldn&rsquo;t be played in your browser.
        </p>
      )}
    </>
  );
}

/** Standalone close (×) button for videos that play ambiently in a page
 * section rather than a dialog — those have no other obvious way to back
 * out of the video short of the small stop icon in the control bar. */
export function VideoCloseButton({ player }: { player: VideoPlayer }) {
  return (
    <button
      type="button"
      className="video-close-btn"
      onClick={player.stop}
      aria-label="Close video"
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}

/** The one custom control bar (play/pause, seek, volume, quality) shared by
 * every video on the site — ambient sections and the film modal alike. */
export function VideoControls({ player }: { player: VideoPlayer }) {
  return (
    <div className="video-controls">
      <button
        type="button"
        className="video-control-btn"
        onClick={player.togglePlayPause}
        aria-label={player.paused ? "Play video" : "Pause video"}
      >
        {player.paused ? (
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="video-control-btn video-stop-btn"
        onClick={player.stop}
        aria-label="Stop video"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="1.5" />
        </svg>
      </button>
      <span className="video-time">{formatVideoTime(player.currentTime)}</span>
      <input
        type="range"
        className="video-seek"
        min={0}
        max={player.duration || 0}
        step={0.1}
        value={player.currentTime}
        onChange={player.seek}
        aria-label="Seek video"
      />
      <span className="video-time">{formatVideoTime(player.duration)}</span>
      <button
        type="button"
        className="video-control-btn"
        onClick={player.toggleMute}
        aria-label={player.muted ? "Unmute video" : "Mute video"}
      >
        {player.muted ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none" />
            <path d="M16 9l6 6M22 9l-6 6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" />
          </svg>
        )}
      </button>
      <input
        type="range"
        className="video-volume"
        min={0}
        max={100}
        value={player.muted ? 0 : player.volume}
        onChange={player.handleVolume}
        aria-label="Volume"
      />
      {player.availableQualities.length > 0 && (
        <select
          className="video-quality-select"
          value={player.quality}
          onChange={player.changeQuality}
          aria-label="Video quality"
        >
          <option value="default">Auto</option>
          {player.availableQualities.map((level) => (
            <option key={level} value={level}>
              {qualityLabel(level)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
