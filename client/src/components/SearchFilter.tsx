import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import { useVideos } from "../context/VideoContext";
import type { VideoStatus, SensitivityLabel } from "../types";

export default function SearchFilter() {
  const { filters, setFilters } = useVideos();
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters({ ...filters, search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch, filters, setFilters]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-zinc-500" />
        </div>
        <input
          type="text"
          placeholder="Search videos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-zinc-800 rounded-lg bg-zinc-900/50 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:text-sm transition-colors"
        />
      </div>
      
      <div className="flex gap-4">
        <select
          value={filters.status || ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              status: (e.target.value as VideoStatus) || undefined,
              page: 1,
            })
          }
          className="block w-full sm:w-40 pl-3 pr-8 py-2 border border-zinc-800 rounded-lg bg-zinc-900/50 text-zinc-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:text-sm transition-colors cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="processed">Processed</option>
          <option value="failed">Failed</option>
        </select>

        <select
          value={filters.sensitivityLabel || ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              sensitivityLabel: (e.target.value as SensitivityLabel) || undefined,
              page: 1,
            })
          }
          className="block w-full sm:w-40 pl-3 pr-8 py-2 border border-zinc-800 rounded-lg bg-zinc-900/50 text-zinc-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:text-sm transition-colors cursor-pointer"
        >
          <option value="">All Scans</option>
          <option value="safe">Safe</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>
    </div>
  );
}
