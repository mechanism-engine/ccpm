export interface ExtensionMetadata {
	npmPackage: string;
	npmPackageDir: string;
	sourceDir: string;
	extName: string;
}

export interface CcpmState {
	version: 1;
	deployedAt: string;
	extensions: Record<
		string,
		{
			npmPackage: string;
			root: string;
		}
	>;
}
