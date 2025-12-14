export type LayoutConfig = {
  y_row_threshold_factor: number;
  section_vertical_gap_factor: number;
  cell_gap_factor: number;
  table_min_rows: number;
  table_multicell_ratio: number;
  table_numeric_lastcell_ratio: number;
  anchor_merge_factor: number;
  anchor_assign_max_dist_factor: number;
  max_columns: number;
};

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  y_row_threshold_factor: 0.65,
  section_vertical_gap_factor: 2.6,
  cell_gap_factor: 2.2,
  table_min_rows: 2,
  table_multicell_ratio: 0.45,
  table_numeric_lastcell_ratio: 0.5,
  anchor_merge_factor: 2.5,
  anchor_assign_max_dist_factor: 4.0,
  max_columns: 4,
};
