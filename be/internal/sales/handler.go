package sales

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

type orderPayload struct {
	CustomerName string  `json:"customer_name" binding:"required"`
	Total        float64 `json:"total"`
	Status       string  `json:"status"`
}

func (h *Handler) List(c *gin.Context) {
	orders, err := h.service.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list orders"})
		return
	}
	c.JSON(http.StatusOK, orders)
}

func (h *Handler) Get(c *gin.Context) {
	o, err := h.service.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, o)
}

func (h *Handler) Create(c *gin.Context) {
	var req orderPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	o, err := h.service.Create(c.Request.Context(), Order{CustomerName: req.CustomerName, Total: req.Total, Status: req.Status})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, o)
}

func (h *Handler) Update(c *gin.Context) {
	var req orderPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	o, err := h.service.Update(c.Request.Context(), Order{ID: c.Param("id"), CustomerName: req.CustomerName, Total: req.Total, Status: req.Status})
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, o)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.service.Delete(c.Request.Context(), c.Param("id")); err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) RegisterRoutes(router *gin.Engine) {
	router.GET("/orders", h.List)
	router.GET("/orders/:id", h.Get)

	protected := router.Group("")
	protected.Use(authtoken.RequireBearer())
	protected.POST("/orders", h.Create)
	protected.PUT("/orders/:id", h.Update)
	protected.DELETE("/orders/:id", h.Delete)
}
