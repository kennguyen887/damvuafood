import store from "@lib/mock/store.json"

function normalize(input: string) {
  return input.trim().toLowerCase()
}

export function searchProductIdsLocal(query: string, limit: number = 50) {
  const q = normalize(query)
  if (!q) return []

  const scored = store.products
    .map((p) => {
      const haystack = normalize([p.title, p.handle, p.description].join(" "))
      const idx = haystack.indexOf(q)
      const score =
        idx === -1
          ? Number.POSITIVE_INFINITY
          : idx + (p.title.toLowerCase().startsWith(q) ? -10 : 0)
      return { id: p.id, score }
    })
    .filter((x) => Number.isFinite(x.score))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)

  return scored.map((x) => x.id)
}

