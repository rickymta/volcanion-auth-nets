#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Performance thresholds
const THRESHOLDS = {
  responseTime: {
    p50: 100,   // 50th percentile should be under 100ms
    p95: 500,   // 95th percentile should be under 500ms
    p99: 1000   // 99th percentile should be under 1000ms
  },
  errorRate: 0.01,  // Error rate should be under 1%
  throughput: {
    min: 50  // Minimum requests per second
  }
};

function main() {
  const reportFile = process.argv[2];
  
  if (!reportFile) {
    console.error('Usage: node check-performance-regression.js <report-file>');
    process.exit(1);
  }

  if (!fs.existsSync(reportFile)) {
    console.error(`Report file not found: ${reportFile}`);
    process.exit(1);
  }

  try {
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    const results = analyzePerformance(report);
    
    if (results.passed) {
      console.log('✅ Performance regression check passed');
      console.log('\nPerformance Summary:');
      console.log(`Response Time (p50): ${results.metrics.responseTime.p50}ms`);
      console.log(`Response Time (p95): ${results.metrics.responseTime.p95}ms`);
      console.log(`Response Time (p99): ${results.metrics.responseTime.p99}ms`);
      console.log(`Error Rate: ${(results.metrics.errorRate * 100).toFixed(2)}%`);
      console.log(`Throughput: ${results.metrics.throughput.toFixed(2)} req/s`);
      process.exit(0);
    } else {
      console.error('❌ Performance regression detected!');
      console.error('\nIssues found:');
      results.issues.forEach(issue => {
        console.error(`  - ${issue}`);
      });
      console.error('\nPerformance Summary:');
      console.error(`Response Time (p50): ${results.metrics.responseTime.p50}ms (threshold: ${THRESHOLDS.responseTime.p50}ms)`);
      console.error(`Response Time (p95): ${results.metrics.responseTime.p95}ms (threshold: ${THRESHOLDS.responseTime.p95}ms)`);
      console.error(`Response Time (p99): ${results.metrics.responseTime.p99}ms (threshold: ${THRESHOLDS.responseTime.p99}ms)`);
      console.error(`Error Rate: ${(results.metrics.errorRate * 100).toFixed(2)}% (threshold: ${(THRESHOLDS.errorRate * 100).toFixed(2)}%)`);
      console.error(`Throughput: ${results.metrics.throughput.toFixed(2)} req/s (threshold: ${THRESHOLDS.throughput.min} req/s)`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error reading report: ${error.message}`);
    process.exit(1);
  }
}

function analyzePerformance(report) {
  const aggregate = report.aggregate;
  const issues = [];
  
  // Extract metrics
  const metrics = {
    responseTime: {
      p50: aggregate.latency?.p50 || 0,
      p95: aggregate.latency?.p95 || 0,
      p99: aggregate.latency?.p99 || 0
    },
    errorRate: (aggregate.errors || 0) / (aggregate.requestsCompleted || 1),
    throughput: aggregate.rps?.mean || 0
  };

  // Check response time thresholds
  if (metrics.responseTime.p50 > THRESHOLDS.responseTime.p50) {
    issues.push(`P50 response time too high: ${metrics.responseTime.p50}ms > ${THRESHOLDS.responseTime.p50}ms`);
  }
  
  if (metrics.responseTime.p95 > THRESHOLDS.responseTime.p95) {
    issues.push(`P95 response time too high: ${metrics.responseTime.p95}ms > ${THRESHOLDS.responseTime.p95}ms`);
  }
  
  if (metrics.responseTime.p99 > THRESHOLDS.responseTime.p99) {
    issues.push(`P99 response time too high: ${metrics.responseTime.p99}ms > ${THRESHOLDS.responseTime.p99}ms`);
  }

  // Check error rate
  if (metrics.errorRate > THRESHOLDS.errorRate) {
    issues.push(`Error rate too high: ${(metrics.errorRate * 100).toFixed(2)}% > ${(THRESHOLDS.errorRate * 100).toFixed(2)}%`);
  }

  // Check throughput
  if (metrics.throughput < THRESHOLDS.throughput.min) {
    issues.push(`Throughput too low: ${metrics.throughput.toFixed(2)} req/s < ${THRESHOLDS.throughput.min} req/s`);
  }

  return {
    passed: issues.length === 0,
    issues,
    metrics
  };
}

if (require.main === module) {
  main();
}
