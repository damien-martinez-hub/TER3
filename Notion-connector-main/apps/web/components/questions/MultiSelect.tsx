import React, { ChangeEvent } from "react";

// Définition du type pour les options
export interface Option {
  value: string;
  label: string;
}

interface MultiSelectExampleProps {
  options: readonly Option[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
}

const MultiSelectExample: React.FC<MultiSelectExampleProps> = ({
  options,
  selectedValues,
  onChange,
}) => {
  // Gestion du changement
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(event.target.selectedOptions, (option) => option.value);
    onChange(selected);
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <select
        multiple
        value={selectedValues}
        onChange={handleChange}
        style={{ width: "200px", height: "120px" }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div style={{ marginTop: "1rem" }}>
        <strong>Valeurs sélectionnées :</strong>{" "}
        {selectedValues.length > 0 ? selectedValues.join(", ") : "Aucune"}
      </div>
    </div>
  );
};

export default MultiSelectExample;
