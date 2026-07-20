import { Link } from "react-router-dom";
import { TYPE_EMOJI } from "../data.js";
import { formatRelative } from "../relativeTime.js";

export default function Card({ skill }) {
  return (
    <Link to={`/skill/${skill.name}`} className="card">
      <div className="card-title">{skill.name}</div>
      <div className="badge-row">
        <span className="badge type">{TYPE_EMOJI[skill.type] ?? ""} {skill.type}</span>
        <span className="badge category">{skill.category}</span>
      </div>
      <div className="card-desc">{skill.description}</div>
      {skill.tags?.length > 0 && (
        <div className="card-tags">
          {skill.tags.map((t) => (
            <span key={t} className="card-tag">#{t}</span>
          ))}
        </div>
      )}
      <div className="card-foot">
        <span>{skill.owner}</span>
        <span>v{skill.version}</span>
        {skill.updated && <span title={skill.updated}>{formatRelative(skill.updated)}</span>}
      </div>
    </Link>
  );
}
