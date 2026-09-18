/**
 * Renders one structured-data block.
 *
 * The JSON is built by `@/lib/seo` and stringified there, so nothing
 * interpolated here comes from a request. `<` is still escaped because a
 * literal `</script` anywhere inside the payload — in a title, an FAQ answer,
 * an excerpt — would end the tag early and spill the rest into the page.
 */
export default function JsonLd({ json }: { json: string }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json.replace(/</g, "\u003c") }}
    />
  );
}
