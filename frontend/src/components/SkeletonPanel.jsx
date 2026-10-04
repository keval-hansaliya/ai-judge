/**
 * SkeletonPanel — animated shimmer placeholder shown while a model response is loading.
 *
 * Replaces blank empty panels during the initial battle stream start.
 */
export function SkeletonPanel() {
  return (
    <div className="skeleton-panel" aria-busy="true" aria-label="Loading response...">
      <div className="skeleton-line skeleton-line--header" />
      <div className="skeleton-line skeleton-line--full" />
      <div className="skeleton-line skeleton-line--full" />
      <div className="skeleton-line skeleton-line--three-quarter" />
      <div className="skeleton-line skeleton-line--full" />
      <div className="skeleton-line skeleton-line--half" />
      <div className="skeleton-line skeleton-line--full" />
      <div className="skeleton-line skeleton-line--two-third" />
    </div>
  );
}
