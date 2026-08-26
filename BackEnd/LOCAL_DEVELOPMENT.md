# HERP local development database

This workflow creates a dedicated SQL Server database named `HERP_LOCAL` on
the loopback interface. It never reads from or writes to the company database.
The HR seed contains fictional employees, positions, jobs, and vacation
records only.

## One-time machine setup

1. Install SQL Server Developer locally. Use the default `MSSQLSERVER`
   instance when possible.
2. Open PowerShell as Administrator in `BackEnd` and run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\configure-local-sql.ps1 -InstanceName MSSQLSERVER -Confirm:$false
   ```

   This enables local TCP on port 1433, creates `HERP_LOCAL`, creates a
   local-only SQL login, and writes its generated credential to the
   Git-ignored `.env.local` file. The credential is not printed.

3. Bootstrap and verify the application schema:

   ```powershell
   npm.cmd run db:dev:bootstrap
   npm.cmd run db:dev:verify
   ```

   Bootstrap applies the repository's ordered SQL migrations and then creates
   only model-backed tables that do not have a migration yet. It uses
   `sequelize.sync({ force: false, alter: false })`; `DB_AUTO_SYNC` remains
   `false`, and existing tables are not dropped or automatically altered.

## Start the application against HERP_LOCAL

From `BackEnd`:

```powershell
npm.cmd run start:dev-db
```

From `FrontEnd` in a second terminal:

```powershell
npm.cmd run dev
```

Sign in with `developer@herp.local`. The password field may be left empty in
the current development login flow.

## This Windows 11/NVMe machine

The first SQL Server installation on this machine failed during database
engine startup with repeated misaligned log I/O. Before retrying setup:

1. Open PowerShell as Administrator in `BackEnd` and run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\fix-sql-sector-size.ps1
   ```

2. Restart Windows. The restart is required for the storage-driver setting to
   take effect.
3. After Windows starts again, open PowerShell as Administrator in `BackEnd`
   and run the one-command repair, configuration, bootstrap, and verification:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\complete-local-dev-after-restart.ps1
   ```

   If a previous attempt already created `.env.local`, add
   `-ForceEnvOverwrite` to intentionally rotate its local-only credential.

The sector-size script saves the prior registry key under
`.tools/sql-server/stornvme-device-before-herp.reg` before applying the exact
Microsoft-documented compatibility value. It does not reboot Windows itself.

## Safety behavior

- Bootstrap and verification refuse any host except `127.0.0.1`, `localhost`,
  or `::1` and refuse any database name except `HERP_LOCAL`.
- `.env.local` and `.tools` are ignored by Git.
- Schema and synthetic seed scripts are idempotent.
- Application migrations run in an explicit repository-controlled order before
  the Finance and HR model-only tables are created.
- `DB_AUTO_SYNC=false` remains the required runtime setting. The guarded local
  bootstrap is the only supported schema initialization path for `HERP_LOCAL`.
- The setup does not open a Windows Firewall port.
