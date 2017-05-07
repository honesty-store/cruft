import resolve from 'rollup-plugin-node-resolve';

export default {
  entry: 'lib/index.js',
  external: ['aws-sdk'],
  format: 'cjs',
  plugins: [resolve()],
  dest: 'index.js',
  onwarn(warning) {
    // skip certain warnings
    if (warning.code === 'THIS_IS_UNDEFINED') return;

    // console.warn everything else
    console.warn(warning.message);
  }
};
