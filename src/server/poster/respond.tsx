import { ImageResponse } from "next/og";
import { loadPosterFonts } from "./fonts";
import { Poster, POSTER_WIDTH, posterHeight, type PosterData } from "./poster";

// Builds the PNG response for a poster. `filename` (when given) makes the
// browser download the image instead of displaying it inline.
export async function renderPoster(
  data: PosterData,
  filename?: string,
): Promise<ImageResponse> {
  const fonts = await loadPosterFonts();
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
  };
  if (filename) {
    headers["Content-Disposition"] = `attachment; filename="${filename}"`;
  }
  return new ImageResponse(<Poster {...data} />, {
    width: POSTER_WIDTH,
    height: posterHeight(data),
    fonts: fonts.length ? fonts : undefined,
    headers,
  });
}
