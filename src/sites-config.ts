import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration for a single Hugo site
 */
export interface SiteConfig {
  /** Site name (used as CDK stack ID and CloudFormation export prefix) */
  name: string;
  /** Fully qualified domain name */
  domain: string;
  /** GitHub organization or username */
  githubOrg: string;
  /** GitHub repository name */
  githubRepo: string;
  /** Branches allowed to deploy (defaults to ['main']) */
  allowedBranches?: string[];
}

/**
 * Root configuration structure
 */
export interface SitesConfig {
  sites: SiteConfig[];
}

/**
 * Load sites configuration from config/sites.json
 *
 * @param configPath - Path to config file (defaults to config/sites.json)
 * @returns Parsed and validated site configurations
 * @throws Error if config file is missing or invalid
 */
export function loadSitesConfig(configPath?: string): SitesConfig {
  const defaultPath = path.join(__dirname, '..', 'config', 'sites.json');
  const filePath = configPath || defaultPath;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Sites config file not found: ${filePath}`);
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(fileContent) as SitesConfig;

    // Basic validation
    if (!config.sites || !Array.isArray(config.sites)) {
      throw new Error('Config must have a "sites" array');
    }

    if (config.sites.length === 0) {
      throw new Error('Config must have at least one site');
    }

    // Validate each site
    config.sites.forEach((site, index) => {
      if (!site.name) {
        throw new Error(`Site at index ${index} is missing "name" property`);
      }
      if (!site.domain) {
        throw new Error(`Site "${site.name}" is missing "domain" property`);
      }
      if (!site.githubOrg) {
        throw new Error(`Site "${site.name}" is missing "githubOrg" property`);
      }
      if (!site.githubRepo) {
        throw new Error(`Site "${site.name}" is missing "githubRepo" property`);
      }

      // Set default allowedBranches if not specified
      if (!site.allowedBranches) {
        site.allowedBranches = ['main'];
      }
    });

    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get a single site configuration by name
 *
 * @param name - Site name to look up
 * @param config - Sites config (defaults to loading from file)
 * @returns Site configuration
 * @throws Error if site not found
 */
export function getSiteConfig(name: string, config?: SitesConfig): SiteConfig {
  const sitesConfig = config || loadSitesConfig();
  const site = sitesConfig.sites.find((s) => s.name === name);

  if (!site) {
    throw new Error(`Site "${name}" not found in configuration`);
  }

  return site;
}
