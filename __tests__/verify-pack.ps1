if (!$args.Count -or !$args[0])
{
  throw "Must supply pack version argument"
}

$pack_version = & cmd.exe /c "pack --version 2>&1" | Out-String
Write-Host "Found pack version: $pack_version"
if (!$pack_version.Contains($args[0]))
{
  throw "Unexpected version"
}
