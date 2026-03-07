$roleName = "AawazLambdaRole"
$requiredPolicies = @(
    "arn:aws:iam::aws:policy/AmazonTranscribeFullAccess",
    "arn:aws:iam::aws:policy/AmazonTranslateFullAccess",
    "arn:aws:iam::aws:policy/AmazonPollyFullAccess",
    "arn:aws:iam::aws:policy/AmazonS3FullAccess"
)

try {
    $attachedPolicies = (aws iam list-attached-role-policies --role-name $roleName --query "AttachedPolicies[*].PolicyArn" --output json 2>&1) | ConvertFrom-Json

    if ($null -eq $attachedPolicies) {
        $attachedPolicies = @()
    }

    foreach ($policy in $requiredPolicies) {
        if ($attachedPolicies -notcontains $policy) {
            Write-Host "Attaching policy $policy"
            aws iam attach-role-policy --role-name $roleName --policy-arn $policy 2>&1 | Out-Null
            Write-Host "Attached $policy"
        } else {
            Write-Host "Policy $policy already attached"
        }
    }
} catch {
    Write-Host "Error checking or attaching policies: $_"
}
