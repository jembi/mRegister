// rollup.config.js
export default {
  input: 'app/src/main/assets/modules/fhirFormAndroid.js',
  output: {
    file: 'app/src/main/assets/dist/fhirFormBundle.js',
    format: 'iife'
  }
};
