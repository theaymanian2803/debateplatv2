import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchQuranAsbab } from "@/server/scripture";

const wahidiPage = `<!doctype html>
<html>
  <body>
    <dl class="boxed">
      <dt>Wahidi - Asbab Al-Nuzul by Al-Wahidi</dt>
      <dd class=" highlightable">(Men are in charge of women&#x2026;) [4:34]. Said Muqatil: &quot;This verse was revealed about Sa&#x2018;d ibn al-Rabi&#x2018;&quot; &amp; more.</dd>
    </dl>
  </body>
</html>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchQuranAsbab", () => {
  it("extracts the occasion text and its cited range", async () => {
    const fetchMock = vi.fn(async () => new Response(wahidiPage, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchQuranAsbab({ surah: 4, verse: 34 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://quranx.com/Tafsir/Wahidi/4.34",
      expect.objectContaining({
        headers: expect.objectContaining({ accept: "text/html" }),
      }),
    );
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.found).toBe(true);
    expect(response.result.reference).toBe("4:34");
    expect(response.result.text).toContain("(Men are in charge of women…) [4:34].");
    expect(response.result.text).toContain('Said Muqatil: "This verse was revealed');
    expect(response.result.text).toContain("& more.");
    expect(response.result.attribution).toContain("al-Wahidi");
    expect(response.result.sourceUrl).toBe("https://quranx.com/Tafsir/Wahidi/4.34");
  });

  it("keeps a range reference from the source", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            '<dd class=" highlightable">(Alif. Lam. Mim. This is the Scripture) [2:1-2]. Revealed about the believers.</dd>',
            { status: 200 },
          ),
      ),
    );

    const response = await fetchQuranAsbab({ surah: 2, verse: 2 });

    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.reference).toBe("2:1-2");
  });

  it("reports when no occasion is recorded", async () => {
    const fetchMock = vi.fn(async () => new Response("not found", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchQuranAsbab({ surah: 55, verse: 1 });

    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.found).toBe(false);
    expect(response.result.text).toBe("");
    expect(response.result.reference).toBeNull();
    expect(response.result.sourceUrl).toBe("https://quranx.com/Tafsir/Wahidi/55.1");
  });

  it("rejects invalid references", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchQuranAsbab({ surah: 115, verse: 1 });

    expect(response).toEqual({
      ok: false,
      error: "Could not read that Quran reference. Try 17:3.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
