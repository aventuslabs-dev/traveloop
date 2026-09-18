/**
 * 文化体验预订的错误提示。
 *
 * 注意：账户中心本身（`app/[lang]/account/**`）目前仍是硬编码英文，中文用户
 * 在那里看到的界面还是英文 —— 这里先把报错翻好，其余文案日后一并搬进本命名
 * 空间。
 */
const bookings = {
  /** 对应 lib/booking.ts 的 BookingError；占位符由该类型携带的值填入。 */
  errors: {
    unknownExperience: "找不到该体验项目。",
    noPassChosen: "请选择要使用的通行证。",
    /** `{pass}` 为通行证等级，`{experience}` 为体验名称。 */
    notEntitled: "您的{pass}通行证不包含{experience}。",
    /** `{days}` 为最少提前预订天数。 */
    slotUnavailable: "该时段无法预订。预订须至少提前 {days} 天。",
    /** 同上，另加行程日期限制（订单带有出入境日期时使用）。 */
    slotUnavailableWithinTrip: "该时段无法预订。预订须至少提前 {days} 天，且须在您的行程日期内。",
    participantRange: "参加人数请介于 {min} 至 {max} 人之间。",
    invalidChildren: "请填写有效的儿童人数。",
    packageRequired: "请选择拍摄套餐。",
    /** `{pack}` 为团体套餐名称。 */
    packMinimum: "{pack}至少需要 {min} 人。",
    locationRequired: "请选择地点。",
    locationComingSoon: "{location}尚未开放。",

    /** 通过校验之后、写入时才会出现的错误。 */
    duplicate: "您已预订过此体验项目，请查看下方的预订记录。",
    slotFull: "该时段刚刚订满，请另选日期或时间。",
    saveFailed: "暂时无法保存您的预订，请稍后再试。",
  },
};

export default bookings;
