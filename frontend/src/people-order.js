const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
const itineraryLevels = { confirmation: 1, 'baptism-1': 1, 'baptism-2': 2 };

// Recognize course numbers without treating an academic year (2026) as a level.
export function courseKey(community) {
  const name = community?.name ?? '';
  const match = name.match(/(?:^|[^\p{L}\d])(\d{1,2})(?!\d)\s*[.º°ª]*\s*([a-zñ](?!\p{L}))?/iu);
  return {
    level: match ? Number(match[1]) : (itineraryLevels[community?.itinerary] ?? Number.MAX_SAFE_INTEGER),
    letter: match?.[2] ?? name.match(/(?:^|[\s·–—-])([a-zñ])\s*$/iu)?.[1] ?? '',
    name,
  };
}

export function orderPeople(people, communities, order = 'name') {
  const courses = new Map(communities.map(c => [c.id, courseKey(c)]));
  const unknown = courseKey();
  return [...people].sort((a, b) => {
    if (order === 'course') {
      const ca = courses.get(a.groupId) ?? unknown;
      const cb = courses.get(b.groupId) ?? unknown;
      const courseOrder = ca.level - cb.level || collator.compare(ca.letter, cb.letter) || collator.compare(ca.name, cb.name);
      if (courseOrder) return courseOrder;
    }
    return collator.compare(a.firstName, b.firstName) || collator.compare(a.lastName, b.lastName) || collator.compare(a.id, b.id);
  });
}
