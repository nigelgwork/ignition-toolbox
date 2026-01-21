"""
Ignition Gateway Database Auto-Registration Script Generator

Creates Python scripts to automatically register databases in Ignition Gateway
using the Gateway REST API.
"""

import json
from typing import Any


def generate_ignition_db_registration_script(
    ignition_host: str,
    ignition_port: int,
    admin_username: str,
    admin_password: str,
    databases: list[dict[str, Any]],
) -> str:
    """
    Generate a Python script that auto-registers databases in Ignition Gateway

    Args:
        ignition_host: Ignition Gateway hostname
        ignition_port: Ignition Gateway HTTP port
        admin_username: Gateway admin username
        admin_password: Gateway admin password
        databases: List of database configurations

    Returns:
        Complete Python script as string
    """
    # Build database connection configurations
    db_configs = []
    for db in databases:
        db_type = db.get("type")
        instance_name = db.get("instance_name")
        config = db.get("config", {})

        if db_type == "postgres":
            jdbc_url = f"jdbc:postgresql://{instance_name}:{config.get('port', 5432)}/{config.get('database', 'postgres')}"
            driver = "org.postgresql.Driver"
            username = config.get("username", "postgres")
            password = config.get("password", "postgres")
            validation_query = "SELECT 1"

        elif db_type in ["mariadb", "mysql"]:
            jdbc_url = f"jdbc:mysql://{instance_name}:{config.get('port', 3306)}/{config.get('database', 'mysql')}"
            driver = "com.mysql.cj.jdbc.Driver"
            username = config.get("username", "root")
            password = config.get("password", "password")
            validation_query = "SELECT 1"

        elif db_type == "mssql":
            jdbc_url = f"jdbc:sqlserver://{instance_name}:{config.get('port', 1433)}"
            driver = "com.microsoft.sqlserver.jdbc.SQLServerDriver"
            username = config.get("username", "sa")
            password = config.get("sa_password", "YourStrong!Passw0rd")
            validation_query = "SELECT 1"

        else:
            continue

        db_configs.append(
            {
                "name": f"{db_type.upper()}-{instance_name}",
                "jdbc_url": jdbc_url,
                "driver": driver,
                "username": username,
                "password": password,
                "validation_query": validation_query,
            }
        )

    script = f'''#!/usr/bin/env python3
"""
Ignition Gateway Database Auto-Registration Script
Automatically configures database connections in Ignition Gateway
"""
import requests
import time
import sys
from urllib.parse import urljoin

# Configuration
GATEWAY_URL = "http://{ignition_host}:{ignition_port}"
ADMIN_USERNAME = "{admin_username}"
ADMIN_PASSWORD = "{admin_password}"

# Database configurations
DATABASES = {json.dumps(db_configs, indent=4)}

# ANSI color codes
GREEN = '\\033[92m'
YELLOW = '\\033[93m'
RED = '\\033[91m'
BLUE = '\\033[94m'
RESET = '\\033[0m'


def log_info(message):
    print(f"{{BLUE}}[INFO]{{RESET}} {{message}}")


def log_success(message):
    print(f"{{GREEN}}[SUCCESS]{{RESET}} {{message}}")


def log_warning(message):
    print(f"{{YELLOW}}[WARNING]{{RESET}} {{message}}")


def log_error(message):
    print(f"{{RED}}[ERROR]{{RESET}} {{message}}")


def wait_for_gateway(max_wait=300):
    """Wait for Ignition Gateway to be ready"""
    log_info(f"Waiting for Ignition Gateway at {{GATEWAY_URL}}...")

    start_time = time.time()
    while (time.time() - start_time) < max_wait:
        try:
            response = requests.get(
                urljoin(GATEWAY_URL, "/StatusPing"),
                timeout=5
            )
            if response.status_code == 200:
                log_success("Ignition Gateway is ready!")
                return True
        except requests.exceptions.RequestException:
            pass

        time.sleep(5)
        elapsed = int(time.time() - start_time)
        log_info(f"Still waiting... ({{elapsed}}s/{{max_wait}}s)")

    log_error("Gateway did not become ready in time")
    return False


def get_gateway_session():
    """Create an authenticated session with the Gateway"""
    session = requests.Session()
    login_url = urljoin(GATEWAY_URL, "/data/login")

    try:
        response = session.post(
            login_url,
            json={{
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            }},
            timeout=10
        )

        if response.status_code == 200:
            log_success("Successfully authenticated with Gateway")
            return session
        else:
            log_error(f"Authentication failed: {{response.status_code}}")
            return None

    except requests.exceptions.RequestException as e:
        log_error(f"Failed to authenticate: {{e}}")
        return None


def check_connection_exists(session, connection_name):
    """Check if a database connection already exists"""
    try:
        response = session.get(
            urljoin(GATEWAY_URL, "/data/db-connections"),
            timeout=10
        )

        if response.status_code == 200:
            connections = response.json()
            return any(conn.get("name") == connection_name for conn in connections)

    except Exception as e:
        log_warning(f"Could not check existing connections: {{e}}")

    return False


def create_database_connection(session, db_config):
    """Create a database connection in Ignition"""
    connection_name = db_config["name"]

    log_info(f"Creating database connection: {{connection_name}}")

    if check_connection_exists(session, connection_name):
        log_warning(f"Connection '{{connection_name}}' already exists, skipping")
        return True

    payload = {{
        "name": connection_name,
        "description": f"Auto-configured connection to {{connection_name}}",
        "enabled": True,
        "jdbcUrl": db_config["jdbc_url"],
        "driverClassName": db_config["driver"],
        "username": db_config["username"],
        "password": db_config["password"],
        "validationQuery": db_config["validation_query"],
        "maxConnections": 8,
        "maxIdleConnections": 3,
        "maxIdleTime": 600000,
        "maxConnectionAge": 0,
        "maxQueryTime": 0,
        "testConnOnBorrow": True,
        "testConnOnReturn": False,
        "testConnWhileIdle": True,
        "idleConnectionTestPeriod": 60000,
    }}

    try:
        response = session.post(
            urljoin(GATEWAY_URL, "/data/db-connections"),
            json=payload,
            timeout=30
        )

        if response.status_code in [200, 201]:
            log_success(f"Created connection: {{connection_name}}")
            return True
        else:
            log_error(f"Failed to create connection: {{response.status_code}}")
            log_error(f"Response: {{response.text}}")
            return False

    except requests.exceptions.RequestException as e:
        log_error(f"Exception creating connection: {{e}}")
        return False


def main():
    """Main execution function"""
    print("=" * 60)
    print("Ignition Database Auto-Registration")
    print("=" * 60)
    print()

    if not wait_for_gateway():
        log_error("Exiting: Gateway not ready")
        sys.exit(1)

    session = get_gateway_session()
    if not session:
        log_error("Exiting: Could not authenticate")
        sys.exit(1)

    print()
    log_info(f"Configuring {{len(DATABASES)}} database connection(s)...")
    print()

    success_count = 0
    failed_count = 0

    for db_config in DATABASES:
        if create_database_connection(session, db_config):
            success_count += 1
        else:
            failed_count += 1
        print()

    print("=" * 60)
    print("Summary")
    print("=" * 60)
    log_success(f"Successfully configured: {{success_count}}")
    if failed_count > 0:
        log_error(f"Failed: {{failed_count}}")

    print()
    log_info("Database auto-registration complete!")
    print()
    print("Next steps:")
    print(f"  1. Open Ignition Gateway: {{GATEWAY_URL}}")
    print("  2. Go to Config -> Databases -> Connections")
    print("  3. Verify connections are listed and enabled")
    print()

    sys.exit(0 if failed_count == 0 else 1)


if __name__ == "__main__":
    main()
'''

    return script


def generate_requirements_file() -> str:
    """Generate requirements.txt for the registration script"""
    return """# Requirements for Ignition database auto-registration script
requests>=2.31.0
"""


def generate_ignition_db_readme_section(databases: list[dict[str, Any]]) -> str:
    """Generate README section for Ignition database auto-registration"""
    content = """
## Ignition Database Auto-Registration

Your Ignition Gateway can be configured with automatic database registration.

### Prerequisites

Install Python dependencies:
```bash
pip install -r scripts/requirements.txt
```

### Auto-Configured Databases

The following databases will be automatically registered:

"""

    for db in databases:
        db_type = db.get("type", "").upper()
        instance_name = db.get("instance_name")
        config = db.get("config", {})

        content += f"""
#### {db_type} - {instance_name}
- **Connection Name:** `{db_type}-{instance_name}`
- **Host:** `{instance_name}`
- **Port:** `{config.get('port', 'N/A')}`
- **Database:** `{config.get('database', 'N/A')}`
- **Username:** `{config.get('username', 'N/A')}`
"""

    content += """
### Running the Registration Script

```bash
python3 scripts/register_databases.py
```

### Verifying Database Connections

1. Open Ignition Gateway: `http://localhost:8088`
2. Navigate to **Config -> Databases -> Connections**
3. Verify all connections are listed and show a green status
4. Click "Test Connection" to verify connectivity

### Troubleshooting

**Connection Not Appearing:**
- Check that database containers are running: `docker compose ps`
- Ensure database is ready: `docker compose logs <db-service>`
- Re-run registration script

**Connection Test Fails:**
- Verify database credentials in `.env` file
- Check network connectivity between containers
- Ensure database accepts connections from Docker network
"""

    return content
