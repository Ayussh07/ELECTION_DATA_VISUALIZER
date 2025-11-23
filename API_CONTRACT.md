# API Contract Documentation

## Base URL

```
http://localhost:5000/api
```

## Endpoints

### 1. Get Available Years

**GET** `/years`

Returns all available election years.

**Response:**
```json
[2019, 2014, 2009, 2004, ...]
```

---

### 2. Get All States

**GET** `/states`

Returns all states in the database.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Andhra Pradesh"
  },
  {
    "id": 2,
    "name": "Arunachal Pradesh"
  }
]
```

---

### 3. Get All Parties

**GET** `/parties`

Returns all political parties.

**Response:**
```json
[
  {
    "id": 1,
    "name": "BJP",
    "party_type_tcpd": "National Party"
  },
  {
    "id": 2,
    "name": "INC",
    "party_type_tcpd": "National Party"
  }
]
```

---

### 4. Get Election Results

**GET** `/elections`

Get election results with optional filters.

**Query Parameters:**
- `year` (integer, optional): Filter by election year
- `state` (integer, optional): Filter by state ID
- `party` (integer, optional): Filter by party ID
- `constituency` (string, optional): Filter by constituency name (partial match)
- `limit` (integer, optional, default: 100): Number of results to return
- `offset` (integer, optional, default: 0): Pagination offset

**Example Request:**
```
GET /api/elections?year=2019&state=1&limit=10&offset=0
```

**Response:**
```json
[
  {
    "year": 2019,
    "state_name": "Andhra Pradesh",
    "constituency_name": "Araku",
    "party_name": "YSRCP",
    "candidate_name": "Goddeti Madhavi",
    "gender": "F",
    "votes": 456789,
    "vote_share_percentage": 52.34,
    "turnout_percentage": 78.45,
    "margin_percentage": 5.67,
    "position": 1
  }
]
```

---

### 5. Get Seat Share

**GET** `/seat-share`

Get seat share by party for a specific year.

**Query Parameters:**
- `year` (integer, required): Election year

**Example Request:**
```
GET /api/seat-share?year=2019
```

**Response:**
```json
[
  {
    "party": "BJP",
    "seats": 303
  },
  {
    "party": "INC",
    "seats": 52
  }
]
```

---

### 6. Get Turnout by State

**GET** `/turnout`

Get average turnout percentage by state for a specific year.

**Query Parameters:**
- `year` (integer, required): Election year

**Example Request:**
```
GET /api/turnout?year=2019
```

**Response:**
```json
[
  {
    "state": "Lakshadweep",
    "turnout_pct": 85.23
  },
  {
    "state": "West Bengal",
    "turnout_pct": 82.15
  }
]
```

---

### 7. Get Vote Share

**GET** `/vote-share`

Get vote share statistics by party and state.

**Query Parameters:**
- `year` (integer, required): Election year
- `party` (integer, optional): Filter by party ID

**Example Request:**
```
GET /api/vote-share?year=2019&party=1
```

**Response:**
```json
[
  {
    "state": "Uttar Pradesh",
    "party": "BJP",
    "total_votes": 12345678,
    "avg_vote_share": 49.56
  }
]
```

---

### 8. Get Gender Trend

**GET** `/gender-trend`

Get gender representation trends over years.

**Query Parameters:**
- `party` (integer, optional): Filter by party ID
- `state` (integer, optional): Filter by state ID

**Example Request:**
```
GET /api/gender-trend?party=1
```

**Response:**
```json
[
  {
    "year": 2019,
    "gender": "M",
    "count": 8500,
    "percentage": 92.5
  },
  {
    "year": 2019,
    "gender": "F",
    "count": 700,
    "percentage": 7.5
  }
]
```

---

### 9. Get Narrowest Victories

**GET** `/margins`

Get elections with the narrowest victory margins.

**Query Parameters:**
- `year` (integer, optional): Filter by election year
- `state` (integer, optional): Filter by state ID
- `limit` (integer, optional, default: 10): Number of results

**Example Request:**
```
GET /api/margins?year=2019&limit=10
```

**Response:**
```json
[
  {
    "year": 2019,
    "state_name": "Karnataka",
    "constituency_name": "Chikkaballapur",
    "winner_party": "INC",
    "winner": "M. Veerappa Moily",
    "winner_votes": 123456,
    "runner_up_party": "BJP",
    "runner_up": "B. N. Bache Gowda",
    "runner_up_votes": 123450,
    "margin": 6,
    "margin_percentage": 0.005
  }
]
```

---

### 10. Search

**GET** `/search`

Search for candidates, constituencies, or parties.

**Query Parameters:**
- `q` (string, required): Search query
- `type` (string, optional): Filter type - 'candidate', 'constituency', 'party', or 'all' (default)

**Example Request:**
```
GET /api/search?q=Modi&type=candidate
```

**Response:**
```json
{
  "candidates": [
    {
      "name": "Narendra Modi",
      "sex": "M"
    }
  ],
  "constituencies": [],
  "parties": []
}
```

---

### 11. Get Key Performance Indicators

**GET** `/kpis`

Get key performance indicators for a specific year.

**Query Parameters:**
- `year` (integer, required): Election year

**Example Request:**
```
GET /api/kpis?year=2019
```

**Response:**
```json
{
  "total_seats": 543,
  "overall_turnout": 67.4,
  "women_candidates_pct": 9.2
}
```

---

## Analytics Endpoints

### 12. Highest Turnout State

**GET** `/analytics/highest-turnout`

Get the state with highest turnout for a specific year.

**Query Parameters:**
- `year` (integer, required): Election year

**Response:**
```json
{
  "state": "Lakshadweep",
  "avg_turnout": 85.23
}
```

---

### 13. Seat Changes

**GET** `/analytics/seat-changes`

Get party seat gains/losses between two election years.

**Query Parameters:**
- `year1` (integer, required): First election year
- `year2` (integer, required): Second election year

**Example Request:**
```
GET /api/analytics/seat-changes?year1=2014&year2=2019
```

**Response:**
```json
[
  {
    "party": "BJP",
    "year1_seats": 282,
    "year2_seats": 303,
    "change": 21
  },
  {
    "party": "INC",
    "year1_seats": 44,
    "year2_seats": 52,
    "change": 8
  }
]
```

---

### 14. Women Candidates

**GET** `/analytics/women-candidates`

Get percentage of women candidates by year and/or state.

**Query Parameters:**
- `year` (integer, optional): Filter by election year
- `state` (integer, optional): Filter by state ID

**Response:**
```json
[
  {
    "year": 2019,
    "state": "Kerala",
    "women_count": 45,
    "total_count": 380,
    "percentage": 11.84
  }
]
```

---

### 15. Closest Contests

**GET** `/analytics/closest-contests`

Get top 10 closest election contests.

**Query Parameters:**
- `year` (integer, optional): Filter by election year

**Response:**
```json
[
  {
    "year": 2019,
    "state_name": "Karnataka",
    "constituency_name": "Chikkaballapur",
    "winner_party": "INC",
    "winner": "M. Veerappa Moily",
    "winner_votes": 123456,
    "runner_up_party": "BJP",
    "runner_up": "B. N. Bache Gowda",
    "runner_up_votes": 123450,
    "margin": 6,
    "margin_percentage": 0.005
  }
]
```

---

### 16. Turnout-Margin Correlation

**GET** `/analytics/correlation`

Get correlation between turnout and margin percentage by state.

**Query Parameters:**
- `state` (integer, optional): Filter by state ID

**Response:**
```json
[
  {
    "state": "Kerala",
    "avg_turnout": 77.45,
    "avg_margin": 12.34,
    "data_points": 20,
    "correlation": -0.23
  }
]
```

---

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "error": "Year parameter is required"
}
```

**404 Not Found:**
```json
{
  "error": "Route not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to fetch data",
  "details": "Detailed error message"
}
```

---

## Rate Limiting

Currently, there are no rate limits implemented. For production, consider implementing rate limiting.

## CORS

CORS is enabled for all origins. For production, configure CORS to allow only specific domains.

## Pagination

Endpoints that return lists support pagination via `limit` and `offset` query parameters. Default limit is 100.

## Data Types

- **Integer**: Numeric IDs, years, counts
- **Decimal**: Percentages, vote counts, margins
- **String**: Names, descriptions
- **Boolean**: Flags (incumbent, turncoat, etc.)
- **Date/Time**: Timestamps (ISO 8601 format)


