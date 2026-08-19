package finance

import (
	"errors"
	"net/http"

	"be/pkg/authtoken"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

type txPayload struct {
	RefType string  `json:"ref_type" binding:"required"`
	RefID   string  `json:"ref_id" binding:"required"`
	Amount  float64 `json:"amount"`
	Type    string  `json:"type" binding:"required,oneof=debit credit"`
}

func (h *Handler) List(c *gin.Context) {
	items, err := h.service.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list transactions"})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) Get(c *gin.Context) {
	t, err := h.service.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "transaction not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, t)
}

func (h *Handler) Create(c *gin.Context) {
	var req txPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	t, err := h.service.Create(c.Request.Context(), Transaction{RefType: req.RefType, RefID: req.RefID, Amount: req.Amount, Type: req.Type})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, t)
}

func (h *Handler) Update(c *gin.Context) {
	var req txPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	t, err := h.service.Update(c.Request.Context(), Transaction{ID: c.Param("id"), RefType: req.RefType, RefID: req.RefID, Amount: req.Amount, Type: req.Type})
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "transaction not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, t)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.service.Delete(c.Request.Context(), c.Param("id")); err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "transaction not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) RegisterRoutes(router *gin.Engine) {
	router.GET("/transactions", h.List)
	router.GET("/transactions/:id", h.Get)

	protected := router.Group("")
	protected.Use(authtoken.RequireBearer())
	protected.POST("/transactions", h.Create)
	protected.PUT("/transactions/:id", h.Update)
	protected.DELETE("/transactions/:id", h.Delete)
}
