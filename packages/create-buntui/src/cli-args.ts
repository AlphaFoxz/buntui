let defaultProjectName: string | undefined;

export function getDefaultProjectName(): string | undefined {
  return defaultProjectName;
}

export function setDefaultProjectName(name: string | undefined): void {
  defaultProjectName = name;
}
