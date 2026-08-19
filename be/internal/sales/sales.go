package sales

import "time"

// Order represents a sales order handled by sales-service.
type Order struct {
	ID           string    `json:"id"`
	CustomerName string    `json:"customer_name"`
	Total        float64   `json:"total"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}
