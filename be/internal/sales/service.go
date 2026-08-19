package sales

import "context"

// Service contains sales use cases and their domain dependencies.
type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{repository: repository}
}

func (s *Service) List(ctx context.Context) ([]Order, error) {
	return s.repository.List(ctx)
}
