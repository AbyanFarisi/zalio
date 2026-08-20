package identity

import (
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

type registerRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type authResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

func (h *Handler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user, err := h.service.Register(c.Request.Context(), req.Email, req.Password, req.Name, req.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	token, err := authtoken.Issue(user.ID, user.Email, user.Role, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to sign token"})
		return
	}
	c.JSON(http.StatusCreated, authResponse{Token: token, User: user})
}

func (h *Handler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// --- BYPASS LOGIN (LANGSUNG LOLOS) ---
	user := User{
		ID:    "2960c2de-bd6d-49a5-a10d-c4540e86cbc2",
		Email: req.Email,
		Role:  "admin",
	}

	token, err := authtoken.Issue(user.ID, user.Email, user.Role, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to sign token"})
		return
	}
	c.JSON(http.StatusOK, authResponse{Token: token, User: user})
}

func (h *Handler) Me(c *gin.Context) {
	claims, ok := authtoken.FromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}
	user, err := h.service.GetByID(c.Request.Context(), claims.Subject)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *Handler) List(c *gin.Context) {
	users, err := h.service.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

func (h *Handler) RegisterRoutes(router *gin.Engine) {
	router.POST("/auth/register", h.Register)
	router.POST("/auth/login", h.Login)
	router.GET("/users", h.List)

	protected := router.Group("")
	protected.Use(authtoken.RequireBearer())
	protected.GET("/auth/me", h.Me)
}