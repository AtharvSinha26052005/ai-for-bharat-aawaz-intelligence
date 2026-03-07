Write-Host "--- Infrastructure Verification Checklist ---"

# 1. S3 Buckets
$buckets = @("aawaz-frontend-static", "aawaz-scheme-documents", "aawaz-audio-cache")
foreach ($b in $buckets) {
    try {
        aws s3api head-bucket --bucket $b 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[x] S3 Bucket exists: $b"
        } else {
            Write-Host "[ ] S3 Bucket MISSING: $b"
        }
    } catch {
        Write-Host "[ ] S3 Bucket MISSING or Access Denied: $b"
    }
}

# 2. RDS PostgreSQL
try {
    $rds = aws rds describe-db-instances --db-instance-identifier aawaz-db --query "DBInstances[0].[DBInstanceStatus, Endpoint.Address]" --output json 2>&1 | ConvertFrom-Json
    if ($rds) {
        Write-Host "[x] RDS Instance 'aawaz-db' exists. Status: $($rds[0]), Endpoint: $($rds[1])"
    } else {
        Write-Host "[ ] RDS Instance 'aawaz-db' MISSING"
    }
} catch {
    Write-Host "[ ] RDS Instance 'aawaz-db' MISSING or Error: $_"
}

# 3. ElastiCache Redis
try {
    # Check Replication Group first
    $redis = aws elasticache describe-replication-groups --replication-group-id aawaz-redis-cache --query "ReplicationGroups[0].[Status, NodeGroups[0].PrimaryEndpoint.Address]" --output json 2>&1 | ConvertFrom-Json
    if ($redis) {
        Write-Host "[x] ElastiCache Redis 'aawaz-redis-cache' exists. Status: $($redis[0]), Endpoint: $($redis[1])"
    } else {
        Write-Host "[ ] ElastiCache Redis 'aawaz-redis-cache' MISSING"
    }
} catch {
    Write-Host "[ ] ElastiCache Redis 'aawaz-redis-cache' MISSING or Error: $_"
}

# 4. IAM Role
try {
    aws iam get-role --role-name AawazLambdaRole 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[x] IAM Role exists: AawazLambdaRole"
    } else {
        Write-Host "[ ] IAM Role MISSING: AawazLambdaRole"
    }
} catch {
    Write-Host "[ ] IAM Role MISSING or Access Denied: AawazLambdaRole"
}
