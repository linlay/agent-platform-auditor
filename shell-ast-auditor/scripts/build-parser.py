"""Read the selected Platform tree and build an atomically published parse CLI.
Only this auditor's bin/ is written. Dirty source is recorded, never called a release.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
source = Path(os.environ.get('SHELL_AST_SOURCE', root.parent.parent / 'agent-platform')).resolve()
bindir = root / 'bin'
bindir.mkdir(exist_ok=True)
executable_suffix = '.exe' if os.name == 'nt' else ''
executable_name = 'shell-ast' + executable_suffix

def git(*args):
    return subprocess.check_output(['git', *args], cwd=source)

commit = git('rev-parse', 'HEAD').decode().strip()
dirty = bool(git('status', '--porcelain'))
# Identify the actual working tree, including new reviewer files, without copying
# source/configuration or credentials into the auditor. The digest is not a commit.
def source_fingerprint():
    fingerprint = hashlib.sha256()
    for name in sorted(git('ls-files', '--cached', '--others', '--exclude-standard', '--', '*.go', 'go.mod', 'go.sum', '*.wasm').decode().splitlines()):
        path = source / name
        if path.is_file():
            fingerprint.update(name.encode() + b'\0' + hashlib.sha256(path.read_bytes()).digest())
    return fingerprint.hexdigest()

source_hash = source_fingerprint()
with tempfile.TemporaryDirectory(prefix='parser-build-', dir=bindir) as temp:
    target = Path(temp) / executable_name
    subprocess.run(['go', 'build', '-o', str(target), './cmd/shell-ast'], cwd=source,
                   env={**os.environ, 'CGO_ENABLED': '0'}, check=True)
    if source_hash != source_fingerprint() or commit != git('rev-parse', 'HEAD').decode().strip():
        raise RuntimeError('Platform source changed during build; retry when source is stable (old CLI preserved)')
    help_result = subprocess.run([str(target), '--help'], capture_output=True, timeout=5, check=True)
    supports = b'-syntax-only' in help_result.stdout + help_result.stderr
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    archive = bindir / 'parsers'
    archive.mkdir(exist_ok=True)
    current = bindir / executable_name
    if current.exists():
        old_bytes = current.read_bytes()
        old = archive / ('shell-ast-' + hashlib.sha256(old_bytes).hexdigest() + executable_suffix)
        if not old.exists():
            old.write_bytes(old_bytes)
            old.chmod(0o755)
    manifest = {'sha256': digest, 'mode': 'syntax-only' if supports else 'legacy-syntax',
                'sourceCommit': commit, 'sourceDirty': dirty, 'sourceFingerprint': source_hash,
                'builtAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'goVersion': subprocess.check_output(['go', 'version']).decode().strip()}
    os.replace(target, current)
    manifest_temp = Path(temp) / 'parser-build.json'
    manifest_temp.write_text(json.dumps(manifest, indent=2) + '\n')
    os.replace(manifest_temp, bindir / 'parser-build.json')
print(json.dumps(manifest, indent=2))
