// Service/catalog types used by the admin UI and treatment module.

export interface ServiceCategory {
  id: string
  name: string
  sort_order?: number | null
}

export interface Service {
  id: string
  category_id: string | null
  name: string
  sort_order?: number | null
  // whether the service requires specialised equipment
  uses_equipment: boolean
  // selected equipment id/name (populated once equipment catalog exists)
  equipment?: string
  // whether the service uses a consumable product
  uses_product: boolean
  // selected product id/name (populated once inventory catalog exists)
  product?: string
  price: number
  /** mark service as a multi-session package (e.g. gluta drip) */
  is_package?: boolean
  /** total number of sessions in the package (e.g. 15 for a 15-drip package) */
  session_count?: number
  /** default days between sessions; defaults to 7 (weekly) when not set */
  recurrence_days?: number
}
