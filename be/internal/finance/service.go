package finance

import "context"

// Service contains finance use cases and their domain dependencies.
type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{repository: repository}
}

func (s *Service) List(ctx context.Context) ([]Transaction, error) {
	return s.repository.List(ctx)
}
