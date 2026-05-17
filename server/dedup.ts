export function deduplicateAndScore(experience: any[]) {
  const seen = new Set();

  return experience.map(role => {
    const uniqueBullets = role.bullets.filter((b: string) => {
      const key = b.toLowerCase().replace(/\W/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      ...role,
      bullets: uniqueBullets,
      score: uniqueBullets.length * 10
    };
  });
}
