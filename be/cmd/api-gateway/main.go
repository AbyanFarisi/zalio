package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// serviceURL mengembalikan target URL untuk sebuah service, mengizinkan
// override via env var (mis. IDENTITY_URL=http://identity:8081).
func serviceURL(name, fallback string) *url.URL {
	raw := os.Getenv(strings.ToUpper(name) + "_URL")
	if raw == "" {
		raw = fallback
	}
	u, err := url.Parse(raw)
	if err != nil {
		log.Fatalf("invalid URL for %s: %v", name, err)
	}
	return u
}

// buildProxy membuat reverse proxy yang MENGHAPUS prefix `/<name>` sebelum
// meneruskan request ke service. Header Authorization tetap dibawa.
func buildProxy(prefix string, target *url.URL) http.Handler {
	proxy := httputil.NewSingleHostReverseProxy(target)
	original := proxy.Director
	proxy.Director = func(req *http.Request) {
		original(req)
		req.URL.Path = strings.TrimPrefix(req.URL.Path, prefix)
		if req.URL.Path == "" {
			req.URL.Path = "/"
		}
		req.Host = target.Host
	}
	return proxy
}

func main() {
	routes := map[string]*url.URL{
		"/identity":  serviceURL("identity", "http://localhost:8081"),
		"/product":   serviceURL("product", "http://localhost:8082"),
		"/inventory": serviceURL("inventory", "http://localhost:8083"),
		"/sales":     serviceURL("sales", "http://localhost:8084"),
		"/finance":   serviceURL("finance", "http://localhost:8085"),
	}

	router := gin.Default()
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": "api-gateway", "status": "ok", "routes": []string{
			"/identity/*", "/product/*", "/inventory/*", "/sales/*", "/finance/*",
		}})
	})

	for prefix, target := range routes {
		proxy := buildProxy(prefix, target)
		router.Any(prefix+"/*proxyPath", gin.WrapH(proxy))
	}

	port := os.Getenv("GATEWAY_PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("api-gateway listening on :%s", port)
	log.Fatal(router.Run(":" + port))
}
