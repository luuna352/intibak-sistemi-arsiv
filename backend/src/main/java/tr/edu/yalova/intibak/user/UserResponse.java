package tr.edu.yalova.intibak.user;

/**
 * Bir rol hesabının ekrana giden hali. Şifre hash'i ASLA dışarı verilmez; sadece belirlenip belirlenmediği (passwordSet).
 */
public record UserResponse(Role role, String roleLabel, String displayName, boolean passwordSet) {

    public static UserResponse from(AppUser user) {
        return new UserResponse(user.getRole(), user.getRole().label(), user.getDisplayName(), user.hasPassword());
    }
}
