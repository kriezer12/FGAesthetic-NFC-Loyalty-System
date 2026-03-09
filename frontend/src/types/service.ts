// Service/catalog types used by the admin UI and treatment module.

export interface ServiceCategory {
  id: string
  name: string
}

export interface Service {
  id: string
  category_id: string
  name: string
  // whether the service requires specialised equipment
  uses_equipment: boolean
  // selected equipment id/name (populated once equipment catalog exists)
  equipment?: string
  // whether the service uses a consumable product
  uses_product: boolean
  // selected product id/name (populated once inventory catalog exists)
  product?: string
  price: number
  points_value: number
}
