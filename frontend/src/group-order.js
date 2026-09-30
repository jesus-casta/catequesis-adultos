export function reorderGroups(groups,sourceId,targetId) {
  const from=groups.findIndex(group=>group.id===sourceId);
  const to=groups.findIndex(group=>group.id===targetId);
  if(from<0||to<0||from===to)return groups;
  const reordered=[...groups];
  const [moved]=reordered.splice(from,1);
  reordered.splice(to,0,moved);
  return reordered;
}
