# Implementation Plan: Generalize Questionnaire Response Handling

**Date**: 2025-09-15  
**Task**: Generalize the questionnaire response handling for any questionnaire and questionnaire response (not just Wegovy-specific)  
**Priority**: High  
**Scope**: Minimal - Make existing Wegovy-specific code generic while maintaining simplicity and existing patterns  

## Problem Statement & Context

### Current Situation
The form-auto-population service currently has:
1. **Wegovy-specific interfaces**: `WegovyOutput`, `WegovyOutputItem` types that are hardcoded for Wegovy use case
2. **Hardcoded conversion logic**: `convertToQuestionnaireResponse()` function specifically designed for Wegovy output format
3. **Wegovy-specific answer formatting**: `formatAnswer()` function with hardcoded logic for `patient-age` and `patient-gender` question IDs
4. **Wegovy-specific event structure**: `FormPopulationCompletedEvent` interface with `wegovyOutput` field
5. **Single-purpose converter library**: `@form-auto-population/fhir-questionnaire-converter` library tied to Wegovy format

### Problem
The current implementation is tightly coupled to Wegovy questionnaire structure and cannot handle other types of questionnaires or AI outputs. This limits the system's usefulness for other healthcare forms and questionnaires.

### Healthcare Context
- FHIR R4 compliance must be maintained for all QuestionnaireResponse resources
- Support for various healthcare questionnaire types (prior authorization, assessments, surveys)
- Proper patient data handling and privacy compliance across all questionnaire types
- Reliable event processing for diverse clinical workflows

## Requirements Analysis

### Functional Requirements
1. **Generic Interface Design**: Replace Wegovy-specific types with generic questionnaire response types
2. **Flexible Answer Formatting**: Support various question types and answer formats without hardcoded question IDs
3. **Configurable Conversion**: Allow conversion logic to work with any questionnaire output format
4. **Backward Compatibility**: Ensure existing Wegovy functionality continues to work
5. **Generic Event Handling**: Support generic form completion events regardless of questionnaire type

### Non-Functional Requirements
1. **Maintainability**: Use simple, established patterns from existing codebase
2. **Performance**: Maintain current processing performance (<5 seconds)
3. **Type Safety**: Maintain strong TypeScript typing throughout
4. **Minimal Changes**: Avoid creating new abstractions unnecessarily

### Healthcare Compliance Requirements
1. **FHIR R4**: All QuestionnaireResponse resources must conform to FHIR R4 standard
2. **HIPAA**: Maintain proper handling of patient data in all questionnaire types
3. **Audit Trail**: Preserve audit logging for all questionnaire processing

## Solution Design

### Architecture Approach
**MINIMAL SCOPE**: Rename and generalize existing interfaces and functions without changing core logic or creating new abstractions. Follow the established pattern of simple, focused libraries.

### Technical Approach
1. **Interface Generalization**: Rename `WegovyOutput` → `QuestionnaireOutput`, `WegovyOutputItem` → `QuestionnaireOutputItem`
2. **Remove Hardcoded Logic**: Make answer formatting generic by removing question-ID-specific logic
3. **Event Structure Update**: Update event interfaces to use generic terminology
4. **Library Renaming**: Update function and variable names to be questionnaire-agnostic
5. **Type-Safe Migration**: Ensure all changes maintain TypeScript compliance

### Implementation Strategy
1. **Update Types**: Generalize all Wegovy-specific type definitions
2. **Refactor Functions**: Remove hardcoded question ID logic from answer formatter
3. **Update Service Layer**: Modify service methods to use generic terminology
4. **Update Event Handlers**: Change event processing to handle generic questionnaire data
5. **Maintain Compatibility**: Ensure all existing functionality works with new generic types

### Risk Mitigation
1. **Breaking Changes**: Use type aliases to maintain backward compatibility during transition
2. **Test Coverage**: Comprehensive testing to ensure no functionality is lost
3. **FHIR Compliance**: Validate that generalized code still produces valid FHIR resources
4. **Performance**: Monitor that generalization doesn't impact processing speed

## Test-Driven Development Plan

### Unit Tests
1. **Type Compatibility Tests**
   - Test that new generic types work with existing Wegovy data
   - Test type safety and backward compatibility
   - Test interface changes don't break existing functionality

2. **Answer Formatting Tests**
   - Test generic answer formatting without hardcoded question IDs
   - Test all answer types (string, number, boolean, array)
   - Test edge cases and invalid data handling

3. **Conversion Function Tests**
   - Test generic questionnaire output conversion
   - Test with various questionnaire structures
   - Test metadata handling and FHIR compliance

### Integration Tests
1. **End-to-End Questionnaire Processing**
   - Test complete flow with generic questionnaire data
   - Test with original Wegovy data to ensure backward compatibility
   - Test FHIR server integration with generalized resources

2. **Event Processing Tests**
   - Test generic form completion event handling
   - Test backward compatibility with existing event structure
   - Test error scenarios and recovery

### Test Data Requirements
1. **Generic Test Data**: Sample questionnaire outputs from various healthcare domains
2. **Wegovy Compatibility**: Existing Wegovy test data to verify backward compatibility
3. **Edge Cases**: Test data for various question types and answer formats

## Acceptance Criteria

### Functional Acceptance
- [ ] Generic questionnaire outputs can be processed without Wegovy-specific logic
- [ ] Existing Wegovy functionality continues to work without changes
- [ ] All question types (boolean, integer, decimal, string, choice) are handled generically
- [ ] QuestionnaireResponse resources are created correctly for any questionnaire type
- [ ] Processing time remains under 5 seconds for all questionnaire types

### Technical Acceptance
- [ ] All Wegovy-specific type names are replaced with generic equivalents
- [ ] No hardcoded question IDs remain in answer formatting logic
- [ ] All unit tests pass with >90% coverage
- [ ] Integration tests demonstrate functionality with multiple questionnaire types
- [ ] TypeScript compilation succeeds with strict type checking
- [ ] Code follows existing patterns without new abstractions

### Healthcare Compliance Acceptance
- [ ] All generated QuestionnaireResponse resources conform to FHIR R4 standard
- [ ] Patient data handling remains secure across all questionnaire types
- [ ] Audit trail is maintained for all questionnaire processing
- [ ] No sensitive data exposure in error messages

## Implementation Timeline

### Phase 1: Type Generalization (45 minutes)
- Replace `WegovyOutput` and `WegovyOutputItem` with generic types
- Update all imports and exports
- Update type definitions in service and controller layers
- Ensure TypeScript compilation succeeds

### Phase 2: Function Generalization (30 minutes)
- Remove hardcoded question ID logic from `formatAnswer()` function
- Update function names and comments to be generic
- Generalize `convertToQuestionnaireResponse()` function naming
- Update variable names throughout codebase

### Phase 3: Event Structure Updates (30 minutes)
- Update `FormPopulationCompletedEvent` interface to use generic field names
- Update event handlers to process generic questionnaire data
- Update service method parameters and documentation

### Phase 4: Testing and Validation (60 minutes)
- Update existing tests to use generic types and terminology
- Add tests for new generic functionality
- Test backward compatibility with Wegovy data
- Verify FHIR compliance with generalized output
- Test end-to-end processing with sample questionnaires

### Phase 5: Documentation and Cleanup (15 minutes)
- Update comments and documentation to reflect generic nature
- Clean up any remaining Wegovy-specific references
- Verify code quality gates pass

**Total Estimated Time**: 3 hours

### Go-Live Criteria
1. All tests pass (unit, integration, e2e)
2. TypeScript compilation succeeds with no errors
3. Backward compatibility with Wegovy data verified
4. Manual testing with generic questionnaire data succeeds
5. FHIR compliance validated for all questionnaire types
6. Code quality gates pass (lint, build, coverage)

## Success Metrics

### Business Metrics
- **Questionnaire Support**: System can process any questionnaire type, not just Wegovy
- **Processing Success Rate**: >99% of valid questionnaire events processed successfully
- **Processing Time**: <5 seconds average processing time maintained
- **Backward Compatibility**: 100% compatibility with existing Wegovy workflows

### Technical Metrics
- **Code Generalization**: 0 Wegovy-specific type names or hardcoded question IDs remain
- **Test Coverage**: >90% code coverage maintained
- **Type Safety**: 100% TypeScript strict mode compliance
- **Code Quality**: ESLint/Prettier compliance maintained

### Healthcare-Specific Metrics
- **FHIR Compliance**: All generated QuestionnaireResponse resources validate against FHIR R4
- **Data Integrity**: No data loss during generalization process
- **Privacy Compliance**: No patient data exposure in error logs
- **Audit Compliance**: All questionnaire processing events properly logged

## Implementation Notes

### Files to Modify
1. **Types File**: `/libs/fhir-questionnaire-converter/src/lib/types.ts`
   - Rename `WegovyOutput` → `QuestionnaireOutput`
   - Rename `WegovyOutputItem` → `QuestionnaireOutputItem`
   - Update export statements

2. **Converter File**: `/libs/fhir-questionnaire-converter/src/lib/fhir-questionnaire-converter.ts`
   - Update function parameter types
   - Update variable names and comments
   - Update imports

3. **Answer Formatter**: `/libs/fhir-questionnaire-converter/src/lib/answer-formatter.ts`
   - Remove hardcoded question ID logic for `patient-age` and `patient-gender`
   - Make formatting purely type-based

4. **Service Layer**: `/apps/form-auto-population-service/src/app/form-population.service.ts`
   - Update import statements
   - Update interface and variable names
   - Update method parameter types

5. **Controller Layer**: `/apps/form-auto-population-service/src/app/form-population.controller.ts`
   - Update event interface definition
   - Update field names in event processing

6. **Test Files**: Update all spec files to use new generic types and test generic functionality

### Existing Patterns to Follow
1. **Simple Interface Design**: Follow existing pattern of simple, focused interfaces
2. **Type Safety**: Maintain strict TypeScript typing throughout
3. **Error Handling**: Use established error logging patterns
4. **Testing**: Follow existing test patterns and coverage standards
5. **Library Structure**: Maintain current library organization and export patterns

### Dependencies
- No new dependencies required
- All existing dependencies remain unchanged
- Maintain current library boundaries and exports

### Constraints
- **No New Abstractions**: Use existing patterns and structures
- **Minimal Changes**: Only rename and generalize, don't restructure
- **Backward Compatibility**: Ensure existing Wegovy workflows continue to function
- **Pattern Consistency**: Follow established codebase conventions
- **Simple Solution**: Choose the most straightforward approach that meets requirements

This plan focuses on making the minimum necessary changes to generalize the questionnaire response handling while maintaining all existing functionality and following established patterns in the codebase.