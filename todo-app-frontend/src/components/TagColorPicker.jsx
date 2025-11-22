const COLORS = [
  "#ff7675", "#74b9ff", "#55efc4", "#ffeaa7",
  "#a29bfe", "#fab1a0", "#81ecec", "#fd79a8",
  "#636e72", "#fdcb6e"
];

export default function TagColorPicker({ selected, onSelect }) {
  return (
    <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
      {COLORS.map((c) => (
        <div
          key={c}
          onClick={() => onSelect(c)}
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            backgroundColor: c,
            cursor: "pointer",
            border: selected === c ? "3px solid black" : "2px solid white",
            boxShadow: "0 0 3px rgba(0,0,0,0.3)"
          }}
        ></div>
      ))}
    </div>
  );
}
