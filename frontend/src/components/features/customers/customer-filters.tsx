import { Search, Filter, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"

interface Option<T> {
  label: string
  value: T
}

interface CustomerFiltersProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  showFilters: boolean
  setShowFilters: (show: boolean) => void
  hasActiveFilters: boolean
  skinTypeFilter: string
  setSkinTypeFilter: (val: string) => void
  genderFilter: string
  setGenderFilter: (val: string) => void
  statusFilter: "" | "active" | "inactive" | "archived"
  setStatusFilter: (val: "" | "active" | "inactive" | "archived") => void
  branchFilter: string
  setBranchFilter: (val: string) => void
  sortMetric: "" | "points" | "visits"
  setSortMetric: (val: "" | "points" | "visits") => void
  sortOrder: "asc" | "desc"
  setSortOrder: (val: "asc" | "desc") => void
  branches: Array<{ id: string; name: string }>
}

export function CustomerFilters({
  searchQuery,
  setSearchQuery,
  showFilters,
  setShowFilters,
  hasActiveFilters,
  skinTypeFilter,
  setSkinTypeFilter,
  genderFilter,
  setGenderFilter,
  statusFilter,
  setStatusFilter,
  branchFilter,
  setBranchFilter,
  sortMetric,
  setSortMetric,
  sortOrder,
  setSortOrder,
  branches,
}: CustomerFiltersProps) {
  function renderFilter<T extends string>(
    label: string,
    value: T,
    onChange: (val: T) => void,
    options: Array<Option<T>>,
    disabled?: boolean,
  ) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center justify-between h-9 text-sm"
            disabled={disabled}
          >
            {label}: {options.find((o) => o.value === value)?.label || options[0].label}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
            {options.map((opt) => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                {opt.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="space-y-4">
      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or NFC ID..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters(!showFilters)}>
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Active</span>
          )}
        </Button>
      </div>

      {showFilters && (
        <div className="mb-6 flex flex-wrap gap-4 rounded-lg bg-muted/50 p-4">
          <div>
            {renderFilter(
              "Skin Type",
              skinTypeFilter,
              setSkinTypeFilter,
              [
                { label: "All Skin Types", value: "" },
                { label: "Normal", value: "Normal" },
                { label: "Dry", value: "Dry" },
                { label: "Oily", value: "Oily" },
                { label: "Combination", value: "Combination" },
                { label: "Sensitive", value: "Sensitive" },
              ]
            )}
          </div>
          <div>
            {renderFilter(
              "Gender",
              genderFilter,
              setGenderFilter,
              [
                { label: "All Genders", value: "" },
                { label: "Female", value: "Female" },
                { label: "Male", value: "Male" },
                { label: "Other", value: "Other" },
              ]
            )}
          </div>
          <div>
            {renderFilter(
              "Status",
              statusFilter,
              setStatusFilter,
              [
                { label: "All Statuses", value: "" },
                { label: "Active Clients", value: "active" },
                { label: "Inactive Clients", value: "inactive" },
                { label: "Archived Clients", value: "archived" },
              ]
            )}
          </div>
          <div>
            {renderFilter(
              "Branch",
              branchFilter,
              setBranchFilter,
              [
                { label: "All Branches", value: "" },
                ...branches.map((b) => ({ label: b.name, value: b.id })),
              ]
            )}
          </div>
          <div className="flex items-center gap-2">
            {renderFilter(
              "Sort By",
              sortMetric,
              setSortMetric,
              [
                { label: "Normal", value: "" },
                { label: "Points", value: "points" },
                { label: "Visits", value: "visits" },
              ]
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              disabled={!sortMetric}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
