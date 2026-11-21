export function cardMatchCode(code: string, isService: boolean) {
    return isService ? `Service ${code}` : code
}
