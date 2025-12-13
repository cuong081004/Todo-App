import { useState, useEffect } from "react";

export default function SearchAndFilter({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  disabled = false
}) {
  const [localSearch, setLocalSearch] = useState(search);
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  const handleSearchInput = (e) => {
    setLocalSearch(e.target.value);
  };

  return (
    <div className="search-filter-container">
      <div className="search-row">
        <input
          type="text"
          placeholder="🔍 Tìm kiếm công việc..."
          value={localSearch}
          onChange={handleSearchInput}
          className="search-input"
          disabled={disabled}
        />
      </div>

      <div className="filter-controls">
        <div className="filter-buttons">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => onFilterChange("all")}
            disabled={disabled}
          >
            Tất cả
          </button>
          <button
            className={filter === "completed" ? "active" : ""}
            onClick={() => onFilterChange("completed")}
            disabled={disabled}
          >
            Hoàn thành
          </button>
          <button
            className={filter === "incomplete" ? "active" : ""}
            onClick={() => onFilterChange("incomplete")}
            disabled={disabled}
          >
            Chưa xong
          </button>
          <button
            className={filter === "withDate" ? "active" : ""}
            onClick={() => onFilterChange("withDate")}
            disabled={disabled}
          >
            Có deadline
          </button>
          <button
            className={filter === "overdue" ? "active" : ""}
            onClick={() => onFilterChange("overdue")}
            disabled={disabled}
          >
            Trễ hạn
          </button>
        </div>

        <div className="sort-container">
          <span>Sắp xếp:</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="sort-select"
            disabled={disabled}
          >
            <option value="none">Mặc định</option>
            <option value="date">Deadline gần nhất</option>
            <option value="name">Tên A → Z</option>
          </select>
        </div>
      </div>
    </div>
  );
}