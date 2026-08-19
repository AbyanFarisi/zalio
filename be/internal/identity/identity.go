package identity

import "time"

// User is the identity domain entity exposed by identity-service.
// Password hashing and authentication will be added in a later iteration.
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}
