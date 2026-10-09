$targetDir = "c:\Users\ADMIN\Desktop\ALEROPATH\websit\Event-flow\src"
$files = Get-ChildItem -Path $targetDir -Recurse -Include *.ts,*.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # We want to replace exactly:
    # 1. `const { data: u } = await supabase.auth.getUser();`
    #    with `const { data: { session } } = await supabase.auth.getSession(); const u = { user: session?.user ?? null };`
    # 2. `const { data } = await supabase.auth.getUser();`
    #    with `const { data: { session } } = await supabase.auth.getSession(); const data = { user: session?.user ?? null };`
    # 3. `const { data: { user } } = await supabase.auth.getUser();`
    #    with `const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;`
    # 4. `.then(({ data }) =>` when chaining `getUser()`.
    
    # Actually, a safer mass replace that handles destructuring correctly for `getUser()`:
    # `supabase.auth.getUser()` -> `supabase.auth.getSession().then(({data, error}) => ({data: {user: data.session?.user ?? null}, error}))` 
    # This acts as a drop-in replacement for `getUser()` without changing the return type signature at all!
    # A cleaner way using regex:
    
    if ($content -match "supabase\.auth\.getUser\(\)") {
        $newContent = $content -replace 'supabase\.auth\.getUser\(\)', '(async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })()'
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated $($file.Name)"
    }
}
Write-Host "Done fixing auth."
