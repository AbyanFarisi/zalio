package inventory

import "context"

type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{repository: repository}
}

func (s *Service) List(ctx context.Context) ([]Stock, error) { return s.repository.List(ctx) }
func (s *Service) Get(ctx context.Context, id string) (Stock, error) {
	return s.repository.Get(ctx, id)
}

func (s *Service) Create(ctx context.Context, st Stock) (Stock, error) {
	if st.ID == "" {
		st.ID = NewID()
	}
	return s.repository.Create(ctx, st)
}

func (s *Service) Update(ctx context.Context, st Stock) (Stock, error) {
	return s.repository.Update(ctx, st)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repository.Delete(ctx, id)
}
