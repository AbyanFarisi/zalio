package inventory

import "time"

// Stock represents on-hand inventory for a product at a warehouse.
type Stock struct {
	ID        string    `json:"id"`
	ProductID string    `json:"product_id"`
	Warehouse string    `json:"warehouse"`
	Quantity  int       `json:"quantity"`
	UpdatedAt time.Time `json:"updated_at"`
}
