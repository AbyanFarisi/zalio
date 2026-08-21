package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB
var jwtSecret []byte

func main() {
	dsn := os.Getenv("POSTGRES_URL")
	if dsn == "" {
		dsn = "postgresql://zalio:zalio123@127.0.0.1:5432/zalio?sslmode=disable"
	}
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "zalio-super-secret-key-2025"
	}
	jwtSecret = []byte(secret)

	var err error
	db, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}
	log.Println("[auth-service] connected to postgres")

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/auth/login", loginHandler)
	mux.HandleFunc("/auth/me", meHandler)
	mux.HandleFunc("/auth/branches", branchesHandler)
	mux.HandleFunc("/auth/branches/", branchHandler)
	mux.HandleFunc("/auth/outlets", outletsHandler)
	mux.HandleFunc("/auth/employees", employeesHandler)
	mux.HandleFunc("/auth/employees/", employeeHandler)
	mux.HandleFunc("/auth/users", usersHandler)
	mux.HandleFunc("/auth/roles", rolesHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	log.Printf("[auth-service] listening on :%s", port)
	if err := http.ListenAndServe(":"+port, corsMiddleware(mux)); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]string{"service": "auth-service", "status": "ok"})
}

type LoginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		writeErr(w, 405, "method not allowed")
		return
	}
	var req LoginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	var id, hash, fullName, roleName, branchID, branchName string
	var branchIDNull, roleNameNull, branchNameNull sql.NullString
	err := db.QueryRow(`
		SELECT u.id, u.password_hash, u.full_name, 
		       COALESCE(r.name,''), COALESCE(u.branch_id::text,''), COALESCE(b.name,'')
		FROM users u
		LEFT JOIN user_roles r ON u.role_id = r.id
		LEFT JOIN branches b ON u.branch_id = b.id
		WHERE u.email=$1 AND u.is_active=true
	`, req.Email).Scan(&id, &hash, &fullName, &roleNameNull, &branchIDNull, &branchNameNull)
	if err != nil {
		writeErr(w, 401, "email atau password salah")
		return
	}
	roleName = roleNameNull.String
	branchID = branchIDNull.String
	branchName = branchNameNull.String
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		writeErr(w, 401, "email atau password salah")
		return
	}
	claims := jwt.MapClaims{
		"sub":    id,
		"email":  req.Email,
		"name":   fullName,
		"role":   roleName,
		"branch": branchID,
		"exp":    time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString(jwtSecret)
	if err != nil {
		writeErr(w, 500, "gagal generate token")
		return
	}
	writeJSON(w, 200, map[string]interface{}{
		"token": tokenStr,
		"user": map[string]interface{}{
			"id":          id,
			"email":       req.Email,
			"full_name":   fullName,
			"role":        roleName,
			"branch_id":   branchID,
			"branch_name": branchName,
		},
	})
}

func meHandler(w http.ResponseWriter, r *http.Request) {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		writeErr(w, 401, "unauthorized")
		return
	}
	tokenStr := strings.TrimPrefix(auth, "Bearer ")
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil || !token.Valid {
		writeErr(w, 401, "token invalid")
		return
	}
	writeJSON(w, 200, token.Claims)
}

func branchesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		rows, err := db.Query(`SELECT id, code, name, address, phone, is_active FROM branches ORDER BY created_at`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id, code, name string
			var address, phone sql.NullString
			var active bool
			rows.Scan(&id, &code, &name, &address, &phone, &active)
			list = append(list, map[string]interface{}{
				"id": id, "code": code, "name": name,
				"address": address.String, "phone": phone.String, "is_active": active,
			})
		}
		writeJSON(w, 200, list)
	case "POST":
		var b struct {
			Code    string `json:"code"`
			Name    string `json:"name"`
			Address string `json:"address"`
			Phone   string `json:"phone"`
		}
		json.NewDecoder(r.Body).Decode(&b)
		var id string
		err := db.QueryRow(`INSERT INTO branches (code, name, address, phone) VALUES ($1,$2,$3,$4) RETURNING id`,
			b.Code, b.Name, b.Address, b.Phone).Scan(&id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		writeJSON(w, 201, map[string]interface{}{"id": id, "code": b.Code, "name": b.Name, "address": b.Address, "phone": b.Phone, "is_active": true})
	default:
		writeErr(w, 405, "method not allowed")
	}
}

func branchHandler(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/auth/branches/")
	switch r.Method {
	case "PUT", "PATCH":
		var b struct {
			Code     string `json:"code"`
			Name     string `json:"name"`
			Address  string `json:"address"`
			Phone    string `json:"phone"`
			IsActive *bool  `json:"is_active"`
		}
		json.NewDecoder(r.Body).Decode(&b)
		if b.IsActive != nil {
			_, err := db.Exec(`UPDATE branches SET code=COALESCE(NULLIF($1,''),code), name=COALESCE(NULLIF($2,''),name), address=COALESCE(NULLIF($3,''),address), phone=COALESCE(NULLIF($4,''),phone), is_active=$5 WHERE id=$6`,
				b.Code, b.Name, b.Address, b.Phone, *b.IsActive, id)
			if err != nil {
				writeErr(w, 400, err.Error())
				return
			}
		} else {
			_, err := db.Exec(`UPDATE branches SET code=COALESCE(NULLIF($1,''),code), name=COALESCE(NULLIF($2,''),name), address=COALESCE(NULLIF($3,''),address), phone=COALESCE(NULLIF($4,''),phone) WHERE id=$5`,
				b.Code, b.Name, b.Address, b.Phone, id)
			if err != nil {
				writeErr(w, 400, err.Error())
				return
			}
		}
		writeJSON(w, 200, map[string]string{"id": id, "status": "updated"})
	case "DELETE":
		_, err := db.Exec(`DELETE FROM branches WHERE id=$1`, id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		writeJSON(w, 200, map[string]string{"id": id, "status": "deleted"})
	default:
		writeErr(w, 405, "method not allowed")
	}
}

func outletsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		branchID := r.URL.Query().Get("branch_id")
		var rows *sql.Rows
		var err error
		if branchID != "" {
			rows, err = db.Query(`SELECT o.id, o.branch_id, o.code, o.name, o.address, o.phone, o.is_active, b.name FROM outlets o LEFT JOIN branches b ON o.branch_id=b.id WHERE o.branch_id=$1 ORDER BY o.created_at`, branchID)
		} else {
			rows, err = db.Query(`SELECT o.id, o.branch_id, o.code, o.name, o.address, o.phone, o.is_active, b.name FROM outlets o LEFT JOIN branches b ON o.branch_id=b.id ORDER BY o.created_at`)
		}
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id, code, name string
			var bid, addr, phone, bname sql.NullString
			var active bool
			rows.Scan(&id, &bid, &code, &name, &addr, &phone, &active, &bname)
			list = append(list, map[string]interface{}{
				"id": id, "branch_id": bid.String, "code": code, "name": name,
				"address": addr.String, "phone": phone.String, "is_active": active,
				"branch_name": bname.String,
			})
		}
		writeJSON(w, 200, list)
		return
	}
	if r.Method == "POST" {
		var o struct {
			BranchID string `json:"branch_id"`
			Code     string `json:"code"`
			Name     string `json:"name"`
			Address  string `json:"address"`
			Phone    string `json:"phone"`
		}
		json.NewDecoder(r.Body).Decode(&o)
		var id string
		err := db.QueryRow(`INSERT INTO outlets (branch_id, code, name, address, phone) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
			o.BranchID, o.Code, o.Name, o.Address, o.Phone).Scan(&id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		writeJSON(w, 201, map[string]string{"id": id})
		return
	}
	writeErr(w, 405, "method not allowed")
}

func employeesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		rows, err := db.Query(`SELECT e.id, e.employee_code, e.full_name, COALESCE(e.email,''), COALESCE(e.phone,''), COALESCE(e.role,''), e.salary, e.is_active, COALESCE(b.name,'') FROM employees e LEFT JOIN branches b ON e.branch_id=b.id ORDER BY e.created_at DESC`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id, code, name, email, phone, role, bname string
			var salary float64
			var active bool
			rows.Scan(&id, &code, &name, &email, &phone, &role, &salary, &active, &bname)
			list = append(list, map[string]interface{}{
				"id": id, "employee_code": code, "full_name": name,
				"email": email, "phone": phone, "role": role,
				"salary": salary, "is_active": active, "branch_name": bname,
			})
		}
		writeJSON(w, 200, list)
		return
	}
	if r.Method == "POST" {
		var e struct {
			EmployeeCode string  `json:"employee_code"`
			FullName     string  `json:"full_name"`
			Email        string  `json:"email"`
			Phone        string  `json:"phone"`
			Role         string  `json:"role"`
			Salary       float64 `json:"salary"`
			BranchID     string  `json:"branch_id"`
		}
		json.NewDecoder(r.Body).Decode(&e)
		var id string
		var bid interface{} = nil
		if e.BranchID != "" {
			bid = e.BranchID
		}
		err := db.QueryRow(`INSERT INTO employees (employee_code, full_name, email, phone, role, salary, branch_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
			e.EmployeeCode, e.FullName, e.Email, e.Phone, e.Role, e.Salary, bid).Scan(&id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		writeJSON(w, 201, map[string]string{"id": id})
		return
	}
	writeErr(w, 405, "method not allowed")
}

func employeeHandler(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/auth/employees/")
	if r.Method == "DELETE" {
		_, err := db.Exec(`DELETE FROM employees WHERE id=$1`, id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})
		return
	}
	writeErr(w, 405, fmt.Sprintf("method %s not allowed", r.Method))
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		rows, err := db.Query(`SELECT u.id, u.email, u.full_name, COALESCE(r.name,''), COALESCE(b.name,''), u.is_active FROM users u LEFT JOIN user_roles r ON u.role_id=r.id LEFT JOIN branches b ON u.branch_id=b.id ORDER BY u.created_at`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id, email, name, role, branch string
			var active bool
			rows.Scan(&id, &email, &name, &role, &branch, &active)
			list = append(list, map[string]interface{}{
				"id": id, "email": email, "full_name": name,
				"role": role, "branch_name": branch, "is_active": active,
			})
		}
		writeJSON(w, 200, list)
		return
	}
	writeErr(w, 405, "method not allowed")
}

func rolesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		rows, err := db.Query(`SELECT id, name, COALESCE(description,''), permissions FROM user_roles ORDER BY created_at`)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		defer rows.Close()
		var list []map[string]interface{}
		for rows.Next() {
			var id, name, desc string
			var perms []byte
			rows.Scan(&id, &name, &desc, &perms)
			var p interface{}
			json.Unmarshal(perms, &p)
			list = append(list, map[string]interface{}{
				"id": id, "name": name, "description": desc, "permissions": p,
			})
		}
		writeJSON(w, 200, list)
		return
	}
	writeErr(w, 405, "method not allowed")
}
