package sales

import "context"

type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{repository: repository}
}

func (s *Service) List(ctx context.Context) ([]Order, error) { return s.repository.List(ctx) }
func (s *Service) Get(ctx context.Context, id string) (Order, error) {
	return s.repository.Get(ctx, id)
}

func (s *Service) Create(ctx context.Context, o Order) (Order, error) {
	if o.ID == "" {
		o.ID = NewID()
	}
	return s.repository.Create(ctx, o)
}

func (s *Service) Update(ctx context.Context, o Order) (Order, error) {
	return s.repository.Update(ctx, o)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repository.Delete(ctx, id)
}
