package finance

import "context"

type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{repository: repository}
}

func (s *Service) List(ctx context.Context) ([]Transaction, error) { return s.repository.List(ctx) }
func (s *Service) Get(ctx context.Context, id string) (Transaction, error) {
	return s.repository.Get(ctx, id)
}

func (s *Service) Create(ctx context.Context, t Transaction) (Transaction, error) {
	if t.ID == "" {
		t.ID = NewID()
	}
	return s.repository.Create(ctx, t)
}

func (s *Service) Update(ctx context.Context, t Transaction) (Transaction, error) {
	return s.repository.Update(ctx, t)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repository.Delete(ctx, id)
}
