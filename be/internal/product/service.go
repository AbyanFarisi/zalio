package product

import (
	"context"
	"crypto/rand"
	"encoding/hex"
)

// Service memuat use case product.
type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{repository: repository}
}

func newID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return "prd-" + hex.EncodeToString(b)
}

func (s *Service) List(ctx context.Context) ([]Product, error) {
	return s.repository.List(ctx)
}

func (s *Service) Get(ctx context.Context, id string) (Product, error) {
	return s.repository.Get(ctx, id)
}

func (s *Service) Create(ctx context.Context, p Product) (Product, error) {
	if p.ID == "" {
		p.ID = newID()
	}
	return s.repository.Create(ctx, p)
}

func (s *Service) Update(ctx context.Context, p Product) (Product, error) {
	return s.repository.Update(ctx, p)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repository.Delete(ctx, id)
}
