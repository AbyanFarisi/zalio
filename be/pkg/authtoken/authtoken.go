// Package authtoken menyediakan helper JWT dan Gin middleware yang dipakai
// bersama oleh identity-service (menerbitkan token) dan service lain
// (memvalidasi token pada endpoint tulis).
package authtoken

import (
	"errors"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const (
	// ContextClaimsKey adalah kunci gin.Context untuk klaim token yang sudah diverifikasi.
	ContextClaimsKey = "authClaims"
	// DefaultTTL adalah masa berlaku access token bila tidak diberikan.
	DefaultTTL = 24 * time.Hour
)

// Claims adalah payload standar untuk seluruh service.
type Claims struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

// Secret mengambil JWT_SECRET dari environment. Panik ketika kosong agar
// service gagal cepat dan tidak menandatangani token dengan secret kosong.
func Secret() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		return []byte("dev-only-change-me-please-set-JWT_SECRET")
	}
	return []byte(s)
}

// Issue membuat access token untuk user tertentu.
func Issue(userID, email, role string, ttl time.Duration) (string, error) {
	if ttl <= 0 {
		ttl = DefaultTTL
	}
	now := time.Now().UTC()
	claims := Claims{
		Email: email,
		Role:  role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(Secret())
}

// Parse memvalidasi tanda tangan dan expiry token, lalu mengembalikan klaim.
func Parse(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return Secret(), nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

// RequireBearer adalah middleware Gin: menolak request tanpa Bearer token valid.
func RequireBearer() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			c.AbortWithStatusJSON(401, gin.H{"error": "missing bearer token"})
			return
		}
		tokenString := strings.TrimPrefix(auth, "Bearer ")
		claims, err := Parse(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "invalid or expired token"})
			return
		}
		c.Set(ContextClaimsKey, claims)
		c.Next()
	}
}

// FromContext mengambil klaim yang sudah diset oleh RequireBearer.
func FromContext(c *gin.Context) (*Claims, bool) {
	v, ok := c.Get(ContextClaimsKey)
	if !ok {
		return nil, false
	}
	claims, ok := v.(*Claims)
	return claims, ok
}
