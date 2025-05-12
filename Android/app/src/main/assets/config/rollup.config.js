// assets/config/rollup.config.js

export default {
  input: 'app/src/main/assets/modules/fhirFormModule.js',
  output: {
    file: 'app/src/main/assets/dist/fhirFormBundle.js',
    format: 'iife',
    name: 'FHIRFormHandler'
  }
};
