/**
 * 解析结果类型定义
 * 提供统一的错误处理和结果封装
 */

export class ParseResult<T> {
  constructor(
    public readonly success: boolean,
    public readonly data: T | null,
    public readonly errors: string[] = [],
    public readonly warnings: string[] = []
  ) {}

  /**
   * 创建成功结果
   */
  static success<T>(data: T, warnings: string[] = []): ParseResult<T> {
    return new ParseResult(true, data, [], warnings);
  }

  /**
   * 创建失败结果
   */
  static failure<T>(errors: string[], fallbackData?: T): ParseResult<T> {
    return new ParseResult(false, fallbackData || null, errors);
  }

  /**
   * 创建带警告的成功结果
   */
  static successWithWarnings<T>(data: T, warnings: string[]): ParseResult<T> {
    return new ParseResult(true, data, [], warnings);
  }

  /**
   * 检查是否有错误或警告
   */
  get hasIssues(): boolean {
    return this.errors.length > 0 || this.warnings.length > 0;
  }

  /**
   * 获取所有问题的摘要
   */
  get issuesSummary(): string {
    const issues = [];
    if (this.errors.length > 0) {
      issues.push(`错误: ${this.errors.join(', ')}`);
    }
    if (this.warnings.length > 0) {
      issues.push(`警告: ${this.warnings.join(', ')}`);
    }
    return issues.join('; ');
  }
}
