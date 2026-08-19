package identity

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// ErrInvalidCredentials dikembalikan ketika email/password tidak cocok.
var ErrInvalidCredentials = errors.New("invalid credentials")

// Service berisi use case identity.
type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{repository: repository}
}

func newID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return "usr-" + hex.EncodeToString(b)
}

// Register membuat user baru. role default: "user".
func (s *Service) Register(ctx context.Context, email, password, name, role string) (User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return User{}, errors.New("email and password are required")
	}
	if role == "" {
		role = "user"
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}
	return s.repository.Create(ctx, User{
		ID:           newID(),
		Email:        email,
		Name:         name,
		Role:         role,
		PasswordHash: string(hash),
	})
}

// Authenticate memverifikasi email+password dan mengembalikan user tanpa hash.
func (s *Service) Authenticate(ctx context.Context, email, password string) (User, error) {
	u, err := s.repository.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return User{}, ErrInvalidCredentials
		}
		return User{}, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return User{}, ErrInvalidCredentials
	}
	return u, nil
}

// List mengembalikan seluruh user.
func (s *Service) List(ctx context.Context) ([]User, error) {
	return s.repository.List(ctx)
}

// GetByID mengambil satu user berdasarkan id.
func (s *Service) GetByID(ctx context.Context, id string) (User, error) {
	return s.repository.FindByID(ctx, id)
}

// SeedAdmin memastikan admin default ada. Idempoten.
func (s *Service) SeedAdmin(ctx context.Context, email, password string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return nil
	}
	_, err := s.repository.FindByEmail(ctx, email)
	if err == nil {
		return nil // sudah ada, tidak overwrite password agar aman
	}
	if !errors.Is(err, ErrNotFound) {
		return err
	}
	_, err = s.Register(ctx, email, password, "System Admin", "admin")
	if errors.Is(err, ErrDuplicateEmail) {
		return nil
	}
	return err
}
