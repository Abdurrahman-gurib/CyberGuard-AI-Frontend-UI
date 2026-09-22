import { bandForScore } from "../types";

export interface MatrixCell {
  likelihood: number;
  impact: number;
  count: number;
}

/**
 * 5x5 risk matrix. Rows are likelihood (5 at top, 1 at bottom); columns are
 * impact (1 to 5). Each cell is coloured by the band of likelihood x impact
 * and shows the number of risks scored in that cell.
 */
export default function RiskMatrix({ cells }: { cells: MatrixCell[] }) {
  const countFor = (l: number, i: number) =>
    cells.find((c) => c.likelihood === l && c.impact === i)?.count ?? 0;

  const likelihoods = [5, 4, 3, 2, 1];
  const impacts = [1, 2, 3, 4, 5];

  return (
    <div className="risk-matrix-wrap">
      <table className="risk-matrix" aria-label="Risk matrix (likelihood by impact)">
        <thead>
          <tr>
            <th className="matrix-axis-corner">
              L \ I
            </th>
            {impacts.map((i) => (
              <th key={i} scope="col">
                {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {likelihoods.map((l) => (
            <tr key={l}>
              <th scope="row">{l}</th>
              {impacts.map((i) => {
                const count = countFor(l, i);
                const band = bandForScore(l * i);
                return (
                  <td
                    key={i}
                    className={`matrix-cell matrix-${band}${count > 0 ? " has-count" : ""}`}
                    title={`Likelihood ${l} x Impact ${i} = ${l * i} (${band}) - ${count} risk${count === 1 ? "" : "s"}`}
                  >
                    {count > 0 ? count : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="matrix-legend">
        <span className="legend-item"><span className="legend-swatch matrix-low" /> Low (1–4)</span>
        <span className="legend-item"><span className="legend-swatch matrix-medium" /> Medium (5–9)</span>
        <span className="legend-item"><span className="legend-swatch matrix-high" /> High (10–16)</span>
        <span className="legend-item"><span className="legend-swatch matrix-critical" /> Critical (17–25)</span>
      </div>
    </div>
  );
}
